import { Router } from 'express'

const usersRouter = Router()

usersRouter.post('/', (req, res) => {
  res.send('Create a new user')
})

export default usersRouter
