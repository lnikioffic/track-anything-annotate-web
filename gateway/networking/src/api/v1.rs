use axum::{Router, routing::post};

use crate::api::handlers;

pub fn config_preview() -> Router {
    Router::new().route("/preview", post(handlers::preview::preview))
}
