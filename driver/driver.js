'use strict'

const AWS = require('aws-sdk');
AWS.config.update({ region: `us-west-2` })
const { Consumer } = require("sqs-consumer");
const { Producer } = require('sqs-producer');

const sns = new AWS.SNS();
const topic = `arn:aws:sns:us-west-2:028458219246:caps-enRoute`

// create the producer
const producer = Producer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-deliveredOrders`,
  region: `us-west-2`
})

const app = Consumer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-newOrders`,
  handleMessage: async(message) => {
    sendEnRoute(message);
    addToDeliveredQ(message);
  }
})

function sendEnRoute(message) {
  let body = JSON.parse(message.Body);
  const payload = {
    Message: `Order ${body.id} from store ${body.store} for ${body.customer} is en route!`,
    TopicArn: topic
  }
  sns.publish(payload).promise()
  .then(data => {
    console.log(`Sent "${payload.Message}" to SNS`);
  })
  .catch(console.error)
}

async function addToDeliveredQ(message) {
  try {
    let messageContents = JSON.parse(message.Body);
    messageContents.status = "delivered";
    let updMessage = JSON.stringify(messageContents);
    const response = await producer.send({
      id: message.MessageId,
      body: updMessage
    });
    console.log("Added to delivered SQS", response);
  } catch (err) {
    console.log(err);
  }

}

app.on('error', (err) => {
  console.log(err.message);
})

app.on('processing_error', (err) => {
  console.error(err.message);
})

app.start();
