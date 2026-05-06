use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found")]
    NotFound,
    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("Rabbitmq error: {0}")]
    RabbitMq(#[from] lapin::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("Internal server error")]
    InternalServerError,
    #[error("Bad request: {0}")]
    BadRequest(&'static str),
    #[error("Http client error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Internal server storage error: {0}")]
    InternalServerStorageError(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::Redis(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::RabbitMq(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::InternalServerError => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::Serde(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::BadRequest(e) => (StatusCode::BAD_REQUEST, e.to_string()),
            AppError::Http(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::InternalServerStorageError(e) => {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            }
        };
        let body = Json(ErrorResponse { error: message });
        (status, body).into_response()
    }
}
