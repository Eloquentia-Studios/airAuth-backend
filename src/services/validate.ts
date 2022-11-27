import validator from 'validator'
import { getUser } from './users.js'

/**
 * Check if issuer and label values are either valid strings or null or undefined.
 *
 * @param issuer Custom issuer name.
 * @param label Custom label name.
 * @returns True if the values are valid, false otherwise.
 */
export const isValidIssuerLabel = (issuer: any, label: any): string[] => {
  const errors = []

  if (!isString(issuer) && !isNullOrUndefined(issuer)) {
    errors.push('Invalid issuer.')
  }

  if (!isString(label) && !isNullOrUndefined(label)) {
    errors.push('Invalid label.')
  }

  return errors
}

/**
 * Checks if the given value is a valid OTP URL.
 *
 * @param url Value to validate.
 * @returns True if the value is a valid OTP URL.
 */
export const isValidOtpUrl = (url: string): boolean => {
  // Check that it is string
  if (!isString(url)) return false

  // Check structure of the URL.
  if (!url.match(/^otpauth:\/\/(totp)(\/(([^:?]+)(:([^:?]*))?))?\?(.+)$/gi))
    return false

  // Check that it has a secret.
  if (!url.match(/secret=([^&]+)&/gi)) return false

  // Check all the other parameters.
  const otp = new URL(url)
  const allowedParams = ['secret', 'issuer', 'algorithm', 'digits', 'period']
  for (const param of otp.searchParams.keys()) {
    if (!allowedParams.includes(param)) return false
  }

  // Check that the algorithm is valid.
  const algorithm = otp.searchParams.get('algorithm')
  if (algorithm && !['SHA1', 'SHA256', 'SHA512'].includes(algorithm))
    return false

  // Check that the digits is valid.
  const digits = otp.searchParams.get('digits')
  if (digits && !['6', '8'].includes(digits)) return false

  // Check that the period is valid.
  const period = otp.searchParams.get('period')
  if (period && !['30', '60', '90'].includes(period)) return false

  return true
}

export const isValidUserInformation = async (
  username: string,
  email: string,
  phonenumber: string,
  password: string,
  partialAllowed: boolean
): Promise<string[]> => {
  const errors = []

  if (
    !(isValidUsername(username) || (partialAllowed && username === undefined))
  ) {
    errors.push(
      'Invalid username, must be between 3 and 40 characters and alphanumeric.'
    )
  }

  if (!(isValidEmail(email) || (partialAllowed && email === undefined))) {
    errors.push('Invalid email.')
  }

  if (phonenumber && !isValidPhoneNumber(phonenumber)) {
    errors.push('Invalid phone number.')
  }

  if (
    !(isValidPassword(password) || (partialAllowed && password === undefined))
  ) {
    errors.push(
      'Invalid password, must be at least 10 characters long and be a mix of lowercase, uppercase, numbers and special characters.'
    )
  }

  // Check if there are users with the same username, email or phonenumber.
  if (username && (await getUser(username))) {
    errors.push('Username already exists.')
  }

  if (email && (await getUser(email))) {
    errors.push('Email already exists.')
  }

  if (phonenumber && (await getUser(phonenumber))) {
    errors.push('Phone number already exists.')
  }
  return errors
}

/**
 * Check if user credentials are valid.
 *
 * @param identifier User identifier.
 * @param password Password.
 * @returns True if the identifier and password are valid, false otherwise.
 */
export const isValidCredentials = (
  identifier: string,
  password: string
): string[] => {
  const errors = []

  if (
    !isValidUsername(identifier) &&
    !isValidEmail(identifier) &&
    !isValidPhoneNumber(identifier)
  )
    errors.push(
      'Invalid identifier, must be a username, email or phone number.'
    )

  if (!isValidPassword(password))
    errors.push(
      'Invalid password, must be at least 10 characters long and be a mix of lowercase, uppercase, numbers and special characters.'
    )

  return errors
}

/**
 * Checks if the given value is a valid username.
 *
 * @param username Value to validate.
 * @returns True if the value is a valid username.
 */
export const isValidUsername = (username: string): boolean => {
  return (
    isString(username) &&
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
  return isString(email) && validator.isEmail(email)
}

/**
 * Checks if the given value is a valid phone number.
 *
 * @param phonenumber Value to validate.
 * @returns True if the value is a valid phone number.
 */
export const isValidPhoneNumber = (phonenumber: string): boolean => {
  return isString(phonenumber) && validator.isMobilePhone(phonenumber)
}

/**
 * Checks if the given value is a valid password.
 *
 * @param password Value to validate.
 * @returns True if the value is a valid password.
 */
export const isValidPassword = (password: string): boolean => {
  return (
    isString(password) &&
    validator.isStrongPassword(password, {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })
  )
}

export const isNullOrUndefined = (value: any): boolean => {
  return value === null || value === undefined
}

/**
 * Checks if the given value is a string.
 *
 * @param value Value to check.
 * @returns True if the value is a string.
 */
export const isString = (value: string): boolean => {
  return typeof value === 'string'
}
