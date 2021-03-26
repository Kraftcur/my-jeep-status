const inquirer = require('inquirer')
const axios = require('axios');

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

var minutes = 60 // run every 60 minutes
var isBuildMessageSent = false
var isStickerMessageSent = false
var stickerUrl, buildSheetUrl, alertOnBuild, alertOnSticker, myNumber, vin = undefined

var questions = [
  {
    type: 'input',
    name: 'vin',
    message: "What's you Jeep VIN number?",
    default: MY_VIN
  },
  {
    type: 'confirm',
    name: 'build',
    message: 'Notify me when BUILD SHEET is FOUND?',
    default: 'Yes'
  },
  {
    type: 'confirm',
    name: 'sticker',
    message: 'Notify me when STICKER is FOUND?',
    default: 'Yes'
  },
  {
    type: 'input',
    name: 'number',
    message: "Enter your phone number e.g. +18002223333",
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
    console.log(`*** TWILIO: ${err} ***`)
    console.log(`*** Check TWILIO_ACCOUNT_SID || TWILIO_AUTH_TOKEN || TWILIO_PHONE_NUMBER  ***`)
    process.exit()
  })
}

const exitIfFinished = (message = `Alerting complete.\n\nBUILD SHEET: ${buildSheetUrl}\n\nSTICKER: ${stickerUrl}\n\nSuccess. Exiting app.`) => {
  if ((isBuildMessageSent && isStickerMessageSent) || (isBuildMessageSent && !alertOnSticker) || (isStickerMessageSent && !alertOnBuild)) {
    sendMessage(`\n${message}`).then(res => {
      console.log(`${message}`)
      process.exit()
    })
  } else {
    console.log(`Checking again in ${minutes} minutes\n`) 
  }
}

const isPDFFound = (url) => {
  return axios.get(url)
  .then((res) => {
    if (res.headers['content-length'] < 1150) return false
    return true
  }).catch(err => console.log(err))
}

const checkMyJeepStatus = async () => {

  if (alertOnBuild && !isBuildMessageSent) if (await isPDFFound(buildSheetUrl)) await sendMessage(`\nYour Jeep BUILD SHEET was found! \n\nCheck it out: ${buildSheetUrl}`)
  .then(() => {
    isBuildMessageSent = true
  })

  if (alertOnSticker && !isStickerMessageSent) if (await isPDFFound(stickerUrl)) await sendMessage(`\nYour Jeep STICKER was found! \n\nCheck it out: ${stickerUrl}`)
  .then(() => {
    isStickerMessageSent = true
  })
  var date = new Date()
  if (alertOnBuild) console.log(`*** BUILD SHEET ${isBuildMessageSent ? 'FOUND' : 'NOT FOUND'} -- ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()} ***\n`)
  if (alertOnSticker) console.log(`*** STICKER ${isStickerMessageSent ? 'FOUND' : 'NOT FOUND'} -- ${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()} ***\n`)

  exitIfFinished()
}

promptQuestions().then(() => {
  if(!vin) {
    console.log('Please enter a vin')
    process.exit()
  }
  if(!myNumber) {
    console.log('Please enter a phone number')
    process.exit()
  }
  if (!alertOnBuild && !alertOnSticker) {
    console.log('Nothing to alert on. Exiting app.')
    process.exit()
  }
  console.log('App running...\n')
  console.log(`VIN: ${vin}`)
  console.log(`Phone number: ${myNumber}`)
  console.log(`Alerting on BUILD SHEET: ${alertOnBuild}`)
  console.log(`Alerting on STICKER: ${alertOnSticker}\n`)
  sendMessage(`You are all set! Leave your computer on and awake, or run the program on a server and wait for the good news! \n\n Checking VIN: ${vin}`)
  checkMyJeepStatus()
  setInterval(checkMyJeepStatus, 60*1000*minutes)
})