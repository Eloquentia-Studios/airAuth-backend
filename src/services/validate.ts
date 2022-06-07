import validator from 'validator'

/**
 * Checks if the given value is a valid username.
 *
 * @param username Value to validate.
 * @returns True if the value is a valid username.
 */
export const isValidUsername = (username: string): boolean => {
  return (
    typeof username === 'string' &&
    validator.isLength(username, { min: 3, max: 40 }) &&
    validator.isAlphanumeric(username)
  )
}

/**
 * Checks if the given value is a valid email.
 *
 * @param email Value to validate.
 * @returns True if the value is a valid email.
 */
export const isValidEmail = (email: string): boolean => {
  return typeof email === 'string' && validator.isEmail(email)
}

/**
 * Checks if the given value is a valid phone number.
 *
 * @param phonenumber Value to validate.
 * @returns True if the value is a valid phone number.
 */
export const isValidPhoneNumber = (phonenumber: string): boolean => {
  return typeof phonenumber === 'string' && validator.isMobilePhone(phonenumber)
}

/**
 * Checks if the given value is a valid password.
 *
 * @param password Value to validate.
 * @returns True if the value is a valid password.
 */
export const isValidPassword = (password: string): boolean => {
  return (
    typeof password === 'string' &&
    validator.isStrongPassword(password, {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })
  )
}
