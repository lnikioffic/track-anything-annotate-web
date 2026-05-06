use lapin::{
    BasicProperties, Channel, ConnectionProperties,
    options::{BasicPublishOptions, QueueDeclareOptions},
    types::FieldTable,
};
use uuid::Uuid;

pub struct RabbitmqService {
    channel: Channel,
}

impl RabbitmqService {
    pub async fn new(url: &str) -> Self {
        let connection = lapin::Connection::connect(url, ConnectionProperties::default())
            .await
            .expect("Connetion error");
        let channel = connection
            .create_channel()
            .await
            .expect("Error to create channel");
        Self { channel }
    }

    pub async fn publish_task(
        &self,
        queue_name: &str,
        id: Uuid,
        payload: &[u8],
    ) -> Result<(), lapin::Error> {
        self.channel
            .queue_declare(
                queue_name,
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        let properties = BasicProperties::default().with_message_id(id.to_string().into());
        self.channel
            .basic_publish(
                "",
                queue_name,
                BasicPublishOptions::default(),
                payload,
                properties,
            )
            .await?;

        Ok(())
    }
}
