import { cache } from "react"
import { getSql } from "./db-client"

function sql(...args: [TemplateStringsArray, ...any[]]) {
  return getSql()(...args)
}

export interface User {
  user_id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  email_verified: boolean
  status: string
  role: "user" | "admin"
  created_at: Date
  updated_at: Date
  last_login?: Date
  email_verification_token?: string
  password_reset_token?: string
  password_reset_expires?: Date
  login_attempts?: number
  locked_until?: Date
}

export interface CreateUserData {
  email: string
  password_hash: string
  first_name: string
  last_name: string
  email_verification_token: string
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const [user] = await sql`
    INSERT INTO users (
      email, password_hash, first_name, last_name, 
      email_verification_token, email_verification_expires, email_verified, status, role, login_attempts
    )
    VALUES (
      ${userData.email}, ${userData.password_hash}, 
      ${userData.first_name}, ${userData.last_name},
      ${userData.email_verification_token}, ${verificationExpires}, false, 'active', 'user', 0
    )
    RETURNING *
  `

  // Immediately create the matching customers row so orders and addresses
  // can be linked via customers.id from day one.
  // customers.user_id has no unique constraint, so use WHERE NOT EXISTS to avoid duplicates.
  await sql`
    INSERT INTO customers (user_id, email, first_name, last_name, total_orders, total_spent)
    SELECT
      ${user.user_id}::uuid, ${user.email},
      ${user.first_name}, ${user.last_name},
      0, 0
    WHERE NOT EXISTS (
      SELECT 1 FROM customers WHERE user_id = ${user.user_id}::uuid
    )
  `

  return user as User
}

export const findUserByEmail = cache(async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `
  return (user as User) || null
})

export const findUserById = cache(async function findUserById(id: string): Promise<User | null> {
  const [user] = await sql`
    SELECT * FROM users WHERE user_id = ${id} LIMIT 1
  `
  return (user as User) || null
})

export async function verifyUserEmail(token: string): Promise<{ success: boolean; user?: User }> {
  const result = await sql`
    UPDATE users 
    SET email_verified = true,
        email_verification_token = null,
        email_verification_expires = null,
        updated_at = NOW()
    WHERE email_verification_token = ${token}
      AND email_verification_expires > NOW()
      AND email_verified = false
    RETURNING *
  `

  if (result.length > 0) {
    return { success: true, user: result[0] as User }
  }

  return { success: false }
}

export async function validatePasswordResetToken(tokenHash: string): Promise<boolean> {
  const [user] = await sql`
    SELECT user_id
    FROM users
    WHERE password_reset_token = ${tokenHash}
      AND password_reset_expires > NOW()
      AND status = 'active'
    LIMIT 1
  `

  return !!user
}

export async function setPasswordResetToken(email: string, tokenHash: string, expiresAt: Date): Promise<boolean> {
  const result = await sql`
    UPDATE users 
    SET password_reset_token = ${tokenHash}, password_reset_expires = ${expiresAt}, updated_at = NOW()
    WHERE email = ${email} AND status = 'active'
    RETURNING user_id
  `
  return result.length > 0
}

export async function resetPassword(
  tokenHash: string,
  newPasswordHash: string,
): Promise<{ success: boolean; user?: User }> {
  const result = await sql`
    UPDATE users 
    SET password_hash = ${newPasswordHash}, 
        password_reset_token = null, 
        password_reset_expires = null,
        updated_at = NOW()
    WHERE password_reset_token = ${tokenHash} 
      AND password_reset_expires > NOW()
      AND status = 'active'
    RETURNING *
  `

  if (result.length > 0) {
    return { success: true, user: result[0] as User }
  }

  return { success: false }
}

export async function updateLastLogin(userId: string): Promise<void> {
  await sql`
    UPDATE users 
    SET last_login = NOW(), updated_at = NOW()
    WHERE user_id = ${userId}
  `
}

export async function logLoginAttempt(email: string, success: boolean, ipAddress: string): Promise<void> {
  if (success) {
    // Reset login attempts on successful login
    await sql`
      UPDATE users 
      SET login_attempts = 0, updated_at = NOW()
      WHERE email = ${email}
    `
  } else {
    // Increment login attempts on failed login
    await sql`
      UPDATE users 
      SET login_attempts = COALESCE(login_attempts, 0) + 1, updated_at = NOW()
      WHERE email = ${email}
    `
  }
}

export async function isUserLocked(email: string): Promise<boolean> {
  const [user] = await sql`
    SELECT login_attempts, locked_until 
    FROM users 
    WHERE email = ${email}
  `

  if (!user) return false

  // Check if user is temporarily locked
  if (user.locked_until) {
    if (new Date(user.locked_until) > new Date()) {
      return true
    } else {
      // Lockout expired, reset attempts
      await sql`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, updated_at = NOW()
        WHERE email = ${email}
      `
      user.login_attempts = 0
    }
  }

  // Lock user if too many failed attempts (5 or more)
  if (user.login_attempts >= 5) {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await sql`
      UPDATE users 
      SET locked_until = ${lockUntil}, updated_at = NOW()
      WHERE email = ${email}
    `
    return true
  }

  return false
}
