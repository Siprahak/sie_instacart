export interface Data {
  meta: {
    source: string;
    dow_mapping_assumption: string;
    warning: string;
  };
  kpi: {
    total_orders: number;
    total_users: number;
    total_items: number;
    reorder_rate: number;
    avg_days_between_orders: number;
    total_products: number;
    // 4 KPI Tambahan
    avg_basket_size: number;
    customer_retention_rate: number;
    avg_orders_per_user: number;
    weekend_order_share: number;
  };
  by_dow: { order_dow: number; order_dow_name: string; orders: number; items: number; reordered_items: number }[];
  by_hour: { order_hour_of_day: number; orders: number; items: number; reordered_items: number }[];
  heatmap_dow_hour: { order_dow: number; order_hour_of_day: number; orders: number }[];
  departments: { department_label: string; items: number; reordered_items: number; reorder_rate: number }[];
  aisles: { department_label: string; aisle: string; items: number; reordered_items: number; reorder_rate: number }[];
  products: {
    product_id: number;
    product_name: string;
    aisle: string;
    department_label: string;
    orders: number;
    items: number;
    reordered_items: number;
    reorder_rate: number;
  }[];
  retention_summary: {
    first_time_orders: number;
    repeat_orders: number;
    repeat_users: number;
    one_time_users: number;
  };
  days_prior_dist: { days: number; orders: number }[];
  top_first_cart: { product_id: number; product_name: string; department_label: string; first_cart_count: number }[];
}