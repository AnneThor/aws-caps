'use strict'

const AWS = require('aws-sdk');
AWS.config.update({ region: `us-west-2` })
const { Consumer } = require("sqs-consumer");
const { Producer } = require('sqs-producer');

const sns = new AWS.SNS();
const topic = `arn:aws:sns:us-west-2:028458219246:caps-enRoute`
const topic2 = `arn:aws:sns:us-west-2:028458219246:caps-driverEnRoute`

const app = Consumer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-newOrders`,
  handleMessage: async(message) => {
    setTimeout( () => {
      sendEnRoute(message);
    }, 1000*10)
    setTimeout(() => {
      addToDeliveredQ(message);
    }, 1000*20)
  }
})

function sendEnRoute(message) {
  let body = JSON.parse(message.Body);
  body = JSON.parse(body.Message);
  const payload = {
    Message: `Order ${body.id} from store ${body.store} for ${body.customer} is en route!`,
    TopicArn: topic2
  }
  sns.publish(payload).promise()
  .then(data => {
    console.log(`Sent "${payload.Message}" to SNS`);
  })
  .catch(console.error)
}

async function addToDeliveredQ(message) {

  message = JSON.parse(message.Body).Message;
  message = JSON.parse(message);

  // create the producer
  const producer = Producer.create({
    queueUrl: message.queueUrl,
    region: `us-west-2`
  })

  try {
    message.status = "delivered";
    let updMessage = JSON.stringify(message);
    const response = await producer.send({
      id: message.id,
      body: updMessage
    });
    console.log(`Added order #${message.orderID} to ${message.store} delivered SQS`)
    ;
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
