import { encryptionService } from '../services/AuditLogService'

describe('EncryptionService', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const data = 'sensitive-data-123'
      const encrypted = encryptionService.encrypt(data)
      
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('tag')
      expect(encrypted.encrypted).not.toBe(data)
      
      const decrypted = encryptionService.decrypt(encrypted)
      expect(decrypted).toBe(data)
    })

    it('should encrypt SSN correctly', () => {
      const ssn = '123-45-6789'
      const encrypted = encryptionService.encrypt(ssn)
      const decrypted = encryptionService.decrypt(encrypted)
      expect(decrypted).toBe(ssn)
    })

    it('should produce different ciphertext for same plaintext', () => {
      const data = 'test-data'
      const encrypted1 = encryptionService.encrypt(data)
      const encrypted2 = encryptionService.encrypt(data)
      
      // Different IVs should produce different ciphertext
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      
      // But both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(data)
      expect(encryptionService.decrypt(encrypted2)).toBe(data)
    })

    it('should throw error when encrypting empty data', () => {
      expect(() => encryptionService.encrypt('')).toThrow('Cannot encrypt empty data')
    })

    it('should throw error when decrypting invalid data', () => {
      const invalidData = {
        encrypted: 'invalid',
        iv: 'invalid',
        tag: 'invalid'
      }
      expect(() => encryptionService.decrypt(invalidData)).toThrow()
    })

    it('should detect tampering with authentication tag', () => {
      const data = 'sensitive-data'
      const encrypted = encryptionService.encrypt(data)
      
      // Tamper with the tag
      encrypted.tag = '0'.repeat(32)
      
      expect(() => encryptionService.decrypt(encrypted)).toThrow()
    })

    it('should detect tampering with ciphertext', () => {
      const data = 'sensitive-data'
      const encrypted = encryptionService.encrypt(data)
      
      // Tamper with the ciphertext
      encrypted.encrypted = encrypted.encrypted.replace('a', 'b')
      
      expect(() => encryptionService.decrypt(encrypted)).toThrow()
    })
  })

  describe('hash and verifyHash', () => {
    it('should hash data correctly', () => {
      const data = 'test-data'
      const hash = encryptionService.hash(data)
      
      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(64) // SHA-256 produces 64 hex characters
      expect(hash).not.toBe(data)
    })

    it('should produce same hash for same input', () => {
      const data = 'test-data'
      const hash1 = encryptionService.hash(data)
      const hash2 = encryptionService.hash(data)
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different input', () => {
      const hash1 = encryptionService.hash('data1')
      const hash2 = encryptionService.hash('data2')
      
      expect(hash1).not.toBe(hash2)
    })

    it('should verify correct hash', () => {
      const data = 'test-data'
      const hash = encryptionService.hash(data)
      
      expect(encryptionService.verifyHash(data, hash)).toBe(true)
    })

    it('should reject incorrect hash', () => {
      const data = 'test-data'
      const hash = encryptionService.hash(data)
      
      expect(encryptionService.verifyHash('wrong-data', hash)).toBe(false)
    })

    it('should throw error when hashing empty data', () => {
      expect(() => encryptionService.hash('')).toThrow('Cannot hash empty data')
    })
  })

  describe('encryptObject and decryptObject', () => {
    it('should encrypt sensitive fields in object', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@example.com',
        salary: '75000'
      }
      
      const encrypted = encryptionService.encryptObject(obj)
      
      expect(encrypted.name).toBe('John Doe')
      expect(encrypted.email).toBe('john@example.com')
      expect(encrypted.ssn).not.toBe('123-45-6789')
      expect(encrypted.salary).not.toBe('75000')
      expect(encrypted.ssn).toContain('{')
      expect(encrypted.salary).toContain('{')
    })

    it('should decrypt sensitive fields in object', () => {
      const obj = {
        name: 'John Doe',
        ssn: '123-45-6789',
        salary: '75000'
      }
      
      const encrypted = encryptionService.encryptObject(obj)
      const decrypted = encryptionService.decryptObject(encrypted)
      
      expect(decrypted.name).toBe('John Doe')
      expect(decrypted.ssn).toBe('123-45-6789')
      expect(decrypted.salary).toBe('75000')
    })

    it('should handle objects without sensitive fields', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com'
      }
      
      const encrypted = encryptionService.encryptObject(obj)
      expect(encrypted).toEqual(obj)
    })

    it('should handle null and undefined', () => {
      expect(encryptionService.encryptObject(null)).toBe(null)
      expect(encryptionService.encryptObject(undefined)).toBe(undefined)
      expect(encryptionService.decryptObject(null)).toBe(null)
      expect(encryptionService.decryptObject(undefined)).toBe(undefined)
    })
  })

  describe('generateToken', () => {
    it('should generate random token', () => {
      const token = encryptionService.generateToken()
      
      expect(token).toBeTruthy()
      expect(token).toHaveLength(64) // 32 bytes = 64 hex characters
    })

    it('should generate different tokens', () => {
      const token1 = encryptionService.generateToken()
      const token2 = encryptionService.generateToken()
      
      expect(token1).not.toBe(token2)
    })

    it('should generate token of specified length', () => {
      const token = encryptionService.generateToken(16)
      expect(token).toHaveLength(32) // 16 bytes = 32 hex characters
    })

    it('should throw error for short token length', () => {
      expect(() => encryptionService.generateToken(8)).toThrow()
    })
  })

  describe('generateCode', () => {
    it('should generate numeric code', () => {
      const code = encryptionService.generateCode()
      
      expect(code).toBeTruthy()
      expect(code).toHaveLength(6)
      expect(/^\d+$/.test(code)).toBe(true)
    })

    it('should generate different codes', () => {
      const code1 = encryptionService.generateCode()
      const code2 = encryptionService.generateCode()
      
      // Very unlikely to be the same
      expect(code1).not.toBe(code2)
    })

    it('should generate code of specified length', () => {
      const code = encryptionService.generateCode(8)
      expect(code).toHaveLength(8)
      expect(/^\d+$/.test(code)).toBe(true)
    })

    it('should throw error for invalid code length', () => {
      expect(() => encryptionService.generateCode(2)).toThrow()
      expect(() => encryptionService.generateCode(12)).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('should detect encrypted data', () => {
      const data = 'test-data'
      const encrypted = encryptionService.encrypt(data)
      const serialized = JSON.stringify(encrypted)
      
      expect(encryptionService.isEncrypted(serialized)).toBe(true)
    })

    it('should detect non-encrypted data', () => {
      expect(encryptionService.isEncrypted('plain-text')).toBe(false)
      expect(encryptionService.isEncrypted('123-45-6789')).toBe(false)
    })

    it('should handle invalid input', () => {
      expect(encryptionService.isEncrypted('')).toBe(false)
      expect(encryptionService.isEncrypted(null as any)).toBe(false)
      expect(encryptionService.isEncrypted(undefined as any)).toBe(false)
    })
  })

  describe('maskSensitiveData', () => {
    it('should mask SSN correctly', () => {
      const ssn = '123-45-6789'
      const masked = encryptionService.maskSensitiveData(ssn)
      
      expect(masked).toBe('*******6789')
    })

    it('should mask with custom visible characters', () => {
      const data = '1234567890'
      const masked = encryptionService.maskSensitiveData(data, 2)
      
      expect(masked).toBe('********90')
    })

    it('should handle short data', () => {
      const data = '123'
      const masked = encryptionService.maskSensitiveData(data)
      
      expect(masked).toBe('****')
    })

    it('should handle empty data', () => {
      const masked = encryptionService.maskSensitiveData('')
      expect(masked).toBe('****')
    })
  })

  describe('deriveKey', () => {
    it('should derive key for specific purpose', () => {
      const key1 = encryptionService.deriveKey('user-encryption', 'user-123')
      const key2 = encryptionService.deriveKey('user-encryption', 'user-456')
      
      expect(key1).toBeInstanceOf(Buffer)
      expect(key2).toBeInstanceOf(Buffer)
      expect(key1.length).toBe(32)
      expect(key1.equals(key2)).toBe(false)
    })

    it('should produce same key for same inputs', () => {
      const key1 = encryptionService.deriveKey('purpose', 'context')
      const key2 = encryptionService.deriveKey('purpose', 'context')
      
      expect(key1.equals(key2)).toBe(true)
    })
  })

  describe('validateKeyStrength', () => {
    it('should validate encryption key strength', () => {
      expect(encryptionService.validateKeyStrength()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const data = '你好世界 🌍 مرحبا'
      const encrypted = encryptionService.encrypt(data)
      const decrypted = encryptionService.decrypt(encrypted)
      
      expect(decrypted).toBe(data)
    })

    it('should handle special characters', () => {
      const data = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encryptionService.encrypt(data)
      const decrypted = encryptionService.decrypt(encrypted)
      
      expect(decrypted).toBe(data)
    })

    it('should handle long strings', () => {
      const data = 'a'.repeat(10000)
      const encrypted = encryptionService.encrypt(data)
      const decrypted = encryptionService.decrypt(encrypted)
      
      expect(decrypted).toBe(data)
    })

    it('should handle JSON strings', () => {
      const data = JSON.stringify({ key: 'value', nested: { data: 123 } })
      const encrypted = encryptionService.encrypt(data)
      const decrypted = encryptionService.decrypt(encrypted)
      
      expect(decrypted).toBe(data)
    })
  })
})
