const inquirer = require('inquirer')
const axios = require('axios')

/** ACTION REQUIRED - Twilio Credentials
 * After signing up for TWILIO, you will have access to a TWILIO_ACCOUNT_SID, 
 * TWILIO_AUTH_TOKEN, and a TWILIO_PHONE_NUMBER. 
 * 
 * Either add these as environment variables, or hard code them below (leave the quotes)
 * App will prompt you for phone number and vin. Entering them here will set them as default
 */
const TWILIO_ACCOUNT_SID = 'your twilio account sid';
const TWILIO_AUTH_TOKEN = 'your twilio auth token';
const TWILIO_PHONE_NUMBER = 'your twilio phone number';
const MY_PHONE_NUMBER = 'your phone number' // FORMAT EXAMPLE +18002223333
const MY_VIN = 'your jeep vin' 
 
// OR use environment variables: https://www.twilio.com/docs/usage/secure-credentials
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// const MY_PHONE_NUMBER = process.env.MY_PHONE_NUMBER;
// const MY_VIN = process.env.MY_VIN;

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

var isBuildMessageSent = false
var isStickerMessageSent = false
var stickerUrl, buildSheetUrl, alertOnBuild, alertOnSticker, myNumber = undefined

var questions = [
  {
    type: 'input',
    name: 'vin',
    message: "What's you Jeep VIN number?",
    default: MY_VIN
  },
  {
    type: 'confirm',
    name: 'sticker',
    message: 'Notify me when STICKER is FOUND?',
    default: 'Yes'
  },
  {
    type: 'confirm',
    name: 'build',
    message: 'Notify me when BUILD is FOUND?',
    default: 'Yes'
  },
  {
    type: 'input',
    name: 'number',
    message: "Enter your phone number e.g. +18002223333: \nBe sure to enter it correctly with country code (not sure if out of US works with Twilio trial account).",
    default: MY_PHONE_NUMBER
  },
]

const promptQuestions = async () => {
  return await inquirer.prompt(questions).then(answers => {
    stickerUrl = `https://www.chrysler.com/hostd/windowsticker/getWindowStickerPdf.do?vin=${answers['vin']}`
    buildSheetUrl = `https://www.jeep.com/webselfservice/BuildSheetServlet?vin=${answers['vin']}`
    alertOnBuild = answers['build']
    alertOnSticker = answers['sticker']
    myNumber = answers['number']
    vin = answers['vin']
  }).catch(err => console.log(err))
}

const sendMessage = async (message) => {
  return await client.messages.create({
    to: myNumber,
    from: TWILIO_PHONE_NUMBER,
    body: message
  })
  .catch(err => {
    console.log(`*** TWILIO MESSAGE ERROR ${err} ***`)
    process.exit()
  })
}

const terminateIfFinished = (message = 'Both BUILD SHEET and STICKER have been found. \nTerminating app.') => {
  if (isBuildMessageSent && isStickerMessageSent) {
    sendMessage(`\n${message}`).then(res => {
      console.log(`${message}`)
      process.exit()
    })
  }
}

const isPDFFound = (url) => {
  return axios.get(url)
  .then((res) => {
    if(res.headers['content-length'] < 1150) return false
    return true
  }).catch(err => console.log(err))
}

const checkMyJeepStatus = async () => {
  const date = new Date()
  if(alertOnBuild && !isBuildMessageSent) await isPDFFound(buildSheetUrl) ? sendMessage(`\nYour Jeep BUILD SHEET was found! \n\nCheck it out: ${buildSheetUrl}`)
  .then(() => {
    console.log(`*** BUILD SHEET FOUND -- ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()} ***`)
    isBuildMessageSent = true
  }).then(() => terminateIfFinished()) : null

  if(alertOnSticker && !isStickerMessageSent) await isPDFFound(stickerUrl) ? sendMessage(`\nYour Jeep STICKER was found! \n\nCheck it out: ${stickerUrl}`)
  .then(() => {
    console.log(`*** STICKER FOUND -- ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()} ***`)
    isStickerMessageSent = true
  }).then(() => terminateIfFinished()) : null

}

promptQuestions().then(() => {
  if(!vin) {
    console.log('Please enter a vin')
    process.exit(0)
  }
  sendMessage('You are all set! Leave your computer on and awake, or run the program on a server and wait for the good news!')
  checkMyJeepStatus()
  setInterval(checkMyJeepStatus, 60*1000*30) // run every 30 minutes
})