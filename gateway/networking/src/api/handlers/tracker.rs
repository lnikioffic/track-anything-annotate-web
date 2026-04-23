use std::sync::Arc;

use axum::extract::{Multipart, Path, State};
use bytes::Bytes;
use serde::Serialize;
use uuid::Uuid;

use crate::{
    api::schemas::Metadata,
    error::AppError,
    response::{AppResponse, ProgressResponse, TrackingAcceptedResponse},
    state::AppState,
};

#[derive(Serialize)]
struct TrackingTaskMessage {
    task_id: Uuid,
    storage_path: String,
    file_name: String,
    metadata: String,
}

pub async fn tracking(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<AppResponse<TrackingAcceptedResponse>, AppError> {
    let task_id = Uuid::new_v4();
    let mut file: Bytes = Bytes::new();
    let mut metadata: Option<String> = None;
    let mut file_name = String::from("video1.mp4");

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("invalid multipart body"))?
    {
        let name = field.name().unwrap_or_default();
        match name {
            "file" => {
                file_name = field.file_name().unwrap_or("video.mp4").to_string();
                tracing::info!("{}", file_name);
                file = field
                    .bytes()
                    .await
                    .map_err(|_| AppError::BadRequest("invalid file field"))?;
            }
            "metadata" => {
                metadata = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| AppError::BadRequest("invalid metadata"))?,
                );
            }
            _ => {}
        }
    }

    if file.is_empty() {
        return Err(AppError::BadRequest("file is required"));
    }

    let metadata: Metadata = match metadata {
        Some(raw) => serde_json::from_str(&raw).map_err(|e| {
            tracing::error!("Failed to parse metadata: {}", e);
            AppError::BadRequest("invalid metadata")
        })?,
        None => return Err(AppError::BadRequest("metadata is required")),
    };

    let storage_path = format!("/video/{task_id}_{file_name}");
    state
        .storage
        .upload(&storage_path, file)
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, "storage.upload failed");
            AppError::from(e)
        })?;

    state
        .redis_service
        .set_task_status(task_id, "queued")
        .await?;

    let payload = TrackingTaskMessage {
        task_id,
        storage_path: storage_path.clone(),
        file_name,
        metadata: serde_json::to_string(&metadata)?,
    };
    let payload = serde_json::to_vec(&payload)?;

    state
        .rabbitmq_service
        .publish_task("tracking", task_id, &payload)
        .await?;

    Ok(AppResponse::accepted(TrackingAcceptedResponse {
        task_id,
        status: "queued",
    }))
}

pub async fn checking_progress(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<AppResponse<ProgressResponse>, AppError> {
    let status = state
        .redis_service
        .get_task_status(id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(AppResponse::ok(ProgressResponse {
        task_id: id,
        status,
    }))
}
