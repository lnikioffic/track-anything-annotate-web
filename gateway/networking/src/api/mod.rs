use axum::Router;

pub mod v1;
pub mod handlers;

pub fn configure(app: Router) -> Router {
    app.nest("/v1", v1::config_preview())
}
