use std::sync::Arc;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};

use crate::{api::handlers, state::AppState};

pub fn config_preview(state: Arc<AppState>) -> Router {
    Router::new()
        .merge(
            Router::new()
                .route("/preview", post(handlers::preview::preview))
                .with_state(state.clone())
                .layer(DefaultBodyLimit::disable())
                .layer(DefaultBodyLimit::max(10 * 1024 * 1024)),
        )
        .merge(
            Router::new()
                .route("/progress/{id}", get(handlers::tracker::checking_progress))
                .route("/tracking", post(handlers::tracker::tracking))
                .with_state(state)
                .layer(DefaultBodyLimit::disable())
                .layer(DefaultBodyLimit::max(300 * 1024 * 1024)),
        )
}
