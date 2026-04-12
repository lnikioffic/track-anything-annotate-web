use axum::Router;
use axum::http::{HeaderValue, Request, Response, Method};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub mod v1;
pub mod handlers;

pub fn configure(app: Router) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    app.nest("/v1", v1::config_preview())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}
