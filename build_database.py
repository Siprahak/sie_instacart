"""Buat file dump MySQL (schema + data) dari data bersih Instacart.
Jalankan: python build_mysql_dump.py instacart_clean.parquet   ->  sie_instacart.sql
Impor   : mysql -u root -p < sie_instacart.sql
"""
import sys
import pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "instacart_clean.parquet"
OUT = "sie_instacart.sql"
df = pd.read_parquet(SRC)

DDL = """-- SIE Instacart | star schema | MySQL 8 / MariaDB
CREATE DATABASE IF NOT EXISTS sie_instacart CHARACTER SET utf8mb4;
USE sie_instacart;
SET NAMES utf8mb4;
SET foreign_key_checks = 0; SET unique_checks = 0;
DROP TABLE IF EXISTS order_items, orders, products, aisles, departments;

CREATE TABLE departments (
  department_id INT PRIMARY KEY,
  department_name VARCHAR(50) NOT NULL,
  department_label VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE aisles (
  aisle_id INT PRIMARY KEY,
  aisle VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(department_id)
) ENGINE=InnoDB;

CREATE TABLE products (
  product_id INT PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  aisle_id INT NOT NULL,
  FOREIGN KEY (aisle_id) REFERENCES aisles(aisle_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  user_id INT NOT NULL,
  eval_set VARCHAR(10) NOT NULL,
  order_number SMALLINT NOT NULL,
  is_first_order TINYINT NOT NULL,
  days_since_prior_order TINYINT NULL COMMENT 'NULL = order pertama user',
  order_dow TINYINT NOT NULL COMMENT '0-6 (asumsi 0=Sunday)',
  order_hour_of_day TINYINT NOT NULL,
  CHECK (order_dow BETWEEN 0 AND 6),
  CHECK (order_hour_of_day BETWEEN 0 AND 23),
  KEY idx_orders_dow_hour (order_dow, order_hour_of_day),
  KEY idx_orders_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  add_to_cart_order SMALLINT NOT NULL,
  reordered TINYINT NOT NULL,
  PRIMARY KEY (order_id, product_id),
  KEY idx_items_product (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;
"""

def s(v):  # string literal MySQL
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"

def nullable(v):
    return "NULL" if pd.isna(v) else str(int(v))

def write(f, table, cols, rows, batch=5000):
    f.write(f"\n-- {table}: {len(rows):,} baris\nSET autocommit=0;\n")
    for i in range(0, len(rows), batch):
        f.write(f"INSERT INTO {table} ({cols}) VALUES\n" + ",\n".join(rows[i:i + batch]) + ";\n")
    f.write("COMMIT;\n")

dep = df[["department_id", "department_name", "department_label"]].drop_duplicates("department_id").sort_values("department_id")
ais = df[["aisle_id", "aisle", "department_id"]].drop_duplicates("aisle_id").sort_values("aisle_id")
prd = df[["product_id", "product_name", "aisle_id"]].drop_duplicates("product_id").sort_values("product_id")
ords = df.drop_duplicates("order_id").sort_values("order_id")
items = df.sort_values(["order_id", "product_id"])

with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(DDL)
    write(f, "departments", "department_id,department_name,department_label",
          [f"({a},{s(b)},{s(c)})" for a, b, c in dep.itertuples(index=False)])
    write(f, "aisles", "aisle_id,aisle,department_id",
          [f"({a},{s(b)},{c})" for a, b, c in ais.itertuples(index=False)])
    write(f, "products", "product_id,product_name,aisle_id",
          [f"({a},{s(b)},{c})" for a, b, c in prd.itertuples(index=False)])
    write(f, "orders", "order_id,user_id,eval_set,order_number,is_first_order,days_since_prior_order,order_dow,order_hour_of_day",
          [f"({o},{u},{s(e)},{n},{fo},{nullable(d)},{w},{h})" for o, u, e, n, fo, d, w, h in zip(
              ords.order_id, ords.user_id, ords.eval_set, ords.order_number, ords.is_first_order,
              ords.days_since_prior_order, ords.order_dow, ords.order_hour_of_day)])
    write(f, "order_items", "order_id,product_id,add_to_cart_order,reordered",
          [f"({o},{p},{a},{r})" for o, p, a, r in zip(items.order_id, items.product_id, items.add_to_cart_order, items.reordered)])
    f.write("\nSET foreign_key_checks = 1; SET unique_checks = 1;\n")
print("Selesai:", OUT)