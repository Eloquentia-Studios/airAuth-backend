import { addOtp } from '../services/otp.js'
import { createUser } from '../services/users.js'

const createDummyData = async () => {
  if (process.env.DUMMY_DATA !== 'true') return
  console.log('Adding dummy data...')

  // Create 100 users.
  let seed = Math.floor(Math.random() * 10000000)
  for (let i = 0; i < 100; i++) {
    const id = seed + i
    const user = await createUser(`user${id}`, `user${id}@gmail.com`, `123`)

    // Create 100 OTPs for each user.
    for (let j = 0; j < 100; j++) {
      await addOtp((Math.random() * Math.pow(10, 20)).toString(16), user.id)
    }
  }

  console.log('Added 100 users and 10000 OTPs!')
}

export default createDummyData
