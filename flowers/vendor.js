'use strict'

const faker = require('faker');
require('dotenv').config();

const vendor = process.env.STORE_NAME || "Generic Store Name"
const queueUrl = process.env.STORE_URL

const { Producer } = require('sqs-producer');
const { Consumer } = require("sqs-consumer");
const AWS = require('aws-sdk');
AWS.config.update({ region: `us-west-2` });
const sns = new AWS.SNS();

// topic to push new deliveries to
const topic = `arn:aws:sns:us-west-2:028458219246:caps-enRoute`

// create the producer
const producer = Producer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-newOrders`,
  region: `us-west-2`
})

let counter = 0;

setInterval( async() => {
  const message = {
    id: faker.datatype.uuid(),
    store: vendor,
    queueUrl: queueUrl,
    orderID: faker.datatype.uuid(),
    customer: faker.name.findName(),
    address: faker.address.streetAddress(),
    status: "awaiting pickup"
  }
  let body = JSON.stringify(message);
  const payload = {
    Message: body,
    TopicArn: topic
  }
  sns.publish(payload).promise()
  .then(data => {
    console.log(`Sent order ${message.id} from ${message.store} to SNS`);
  })
  .catch(console.error)
}, 1000*30)

const app = Consumer.create({
  queueUrl: queueUrl,
  handleMessage: async (message) => {
    let body = JSON.parse(message.Body);
    console.log(`Thank you for delivering ${body.id} from ${body.store} to ${body.customer}`);
  }
})

app.on('error', (err) => {
  console.log(err.message);
})

app.on('processing_error', (err) => {
  console.error(err.message);
})

app.start();
