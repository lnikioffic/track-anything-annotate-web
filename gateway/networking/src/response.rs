use axum::{
    Json,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use bytes::Bytes;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct TrackingAcceptedResponse {
    pub task_id: Uuid,
    pub status: &'static str,
}

#[derive(Serialize)]
pub struct ProgressResponse {
    pub task_id: Uuid,
    pub status: String,
}

pub enum AppResponse<T> {
    Json {
        status: StatusCode,
        body: T,
    },
    Binary {
        status: StatusCode,
        headers: HeaderMap,
        body: Bytes,
    },
}

impl<T> IntoResponse for AppResponse<T>
where
    T: Serialize,
{
    fn into_response(self) -> axum::response::Response {
        match self {
            AppResponse::Json { status, body } => (status, Json(body)).into_response(),
            AppResponse::Binary {
                status,
                headers,
                body,
            } => {
                let mut response = (status, body).into_response();
                *response.headers_mut() = headers;
                response
            }
        }
    }
}

impl<T> AppResponse<T>
where
    T: Serialize,
{
    pub fn ok(body: T) -> Self {
        Self::Json {
            status: StatusCode::OK,
            body,
        }
    }
    pub fn accepted(body: T) -> Self {
        Self::Json {
            status: StatusCode::ACCEPTED,
            body,
        }
    }

    pub fn binary(body: Bytes, content_type: &str) -> Self {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::CONTENT_TYPE,
            content_type.parse().unwrap(),
        );

        Self::Binary {
            status: StatusCode::OK,
            headers,
            body,
        }
    }
}
