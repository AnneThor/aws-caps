'use strict'

const faker = require('faker');
require('dotenv').config();
const vendor = process.env.STORE_NAME || "Generic Store Name"
const { Producer } = require('sqs-producer');
const { Consumer } = require("sqs-consumer");
const AWS = require('aws-sdk');
AWS.config.update({ region: `us-west-2` });
const sns = new AWS.SNS();

const topic = `arn:aws:sns:us-west-2:028458219246:caps-enRoute`

// var params = {
//   Protocol: 'lambda',
//   TopicArn: topic,
//   Endpoint: 'arn:aws:lambda:us-west-2:028458219246:function:enRouteAlert',
//   ReturnSubscriptionArn: true
// };
//
// sns.subscribe(params).promise()
// .then(response => {
//   console.log(response);
// })
// .catch(console.error);

// create the producer
const producer = Producer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-newOrders`,
  region: `us-west-2`
})

let counter = 0;

setInterval( async() => {
  try {
    const message = {
        id: faker.datatype.uuid(),
        body: JSON.stringify({
          id: faker.datatype.uuid(),
          store: vendor,
          orderID: faker.datatype.uuid(),
          customer: faker.name.findName(),
          address: faker.address.streetAddress(),
          status: "awaiting pickup"
        }),
    }
    const response = await producer.send(message);
    console.log("Added to new order SQS: ", response);
  } catch (err) {
    console.log(err);
  }
}, 1000*30)

const app = Consumer.create({
  queueUrl: `https://sqs.us-west-2.amazonaws.com/028458219246/caps-deliveredOrders`,
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
