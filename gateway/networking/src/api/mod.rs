use std::sync::Arc;

use axum::Router;

use crate::state::AppState;

pub mod handlers;
pub mod schemas;
pub mod v1;

pub fn configure(app: Router, state: Arc<AppState>) -> Router {
    app.nest("/v1", v1::config_preview(state))
}
