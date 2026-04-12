use axum::{Router, extract::DefaultBodyLimit, routing::post};

use crate::api::handlers;

pub fn config_preview() -> Router {
    Router::new()
        .route("/preview", post(handlers::preview::preview))
        .layer(DefaultBodyLimit::disable())
        .layer(DefaultBodyLimit::max(250 * 1024 * 1024))
}
