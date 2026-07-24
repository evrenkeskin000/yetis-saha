import { describe, expect, it } from 'vitest';
import { OUTCOMES } from '../constants';
import {
  checkInSchema,
  customerFormSchema,
  geoPointSchema,
  trPhoneSchema,
  visitCompletionSchema,
} from '../validation';

describe('validation schemas', () => {
  describe('trPhoneSchema', () => {
    it('should validate valid Turkish mobile phone numbers', () => {
      const validPhones = ['05321112233', '+905321112233', '5321112233', ''];
      validPhones.forEach((phone) => {
        const res = trPhoneSchema.safeParse(phone);
        expect(res.success).toBe(true);
      });
    });

    it('should reject invalid mobile phone numbers', () => {
      const invalidPhones = ['02121112233', '1234567890', 'abc', '0532111223'];
      invalidPhones.forEach((phone) => {
        const res = trPhoneSchema.safeParse(phone);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error.issues[0].message).toBe(
            'Geçerli bir cep telefonu girin (05XXXXXXXXX)'
          );
        }
      });
    });
  });

  describe('geoPointSchema', () => {
    it('should pass for locations within Turkey bounds', () => {
      const kadikoy = { latitude: 40.9903, longitude: 29.027 };
      const res = geoPointSchema.safeParse(kadikoy);
      expect(res.success).toBe(true);
    });

    it('should fail for locations outside Turkey bounds', () => {
      const london = { latitude: 51.5074, longitude: -0.1278 };
      const res = geoPointSchema.safeParse(london);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe(
          'Konum Türkiye sınırları içerisinde olmalıdır'
        );
      }
    });

    it('should fail for out of range latitude/longitude values', () => {
      const invalidLat = { latitude: 100, longitude: 29.027 };
      const res = geoPointSchema.safeParse(invalidLat);
      expect(res.success).toBe(false);
    });
  });

  describe('customerFormSchema', () => {
    it('should validate complete valid customer input', () => {
      const input = {
        business_name: 'Kadıköy Bakkal',
        owner_name: 'Ahmet Yılmaz',
        phone: '05321112233',
        address: 'Moda Cad.',
        category_id: 'c0000000-0000-0000-0000-000000000001',
        location: { latitude: 40.9903, longitude: 29.027 },
        geofence_radius_m: 150,
        notes: 'Örnek not',
      };
      const res = customerFormSchema.safeParse(input);
      expect(res.success).toBe(true);
    });

    it('should fail when business_name is shorter than 2 chars', () => {
      const input = {
        business_name: 'A',
        category_id: 'c0000000-0000-0000-0000-000000000001',
        location: { latitude: 40.9903, longitude: 29.027 },
      };
      const res = customerFormSchema.safeParse(input);
      expect(res.success).toBe(false);
    });
  });

  describe('checkInSchema', () => {
    it('should validate valid check-in input', () => {
      const input = {
        customer_id: 'e0000000-0000-0000-0000-000000000001',
        location: { latitude: 40.9903, longitude: 29.027 },
        is_mock_location: false,
        notes: 'Ziyaret başlangıcı',
      };
      const res = checkInSchema.safeParse(input);
      expect(res.success).toBe(true);
    });
  });

  describe('visitCompletionSchema', () => {
    it('should validate visit completion for all 7 outcomes', () => {
      OUTCOMES.forEach((outcome) => {
        const input = {
          visit_id: 'f0000000-0000-0000-0000-000000000001',
          outcome,
          location: { latitude: 40.9903, longitude: 29.027 },
        };
        const res = visitCompletionSchema.safeParse(input);
        expect(res.success).toBe(true);
      });
    });

    it('should fail for an invalid outcome', () => {
      const input = {
        visit_id: 'f0000000-0000-0000-0000-000000000001',
        outcome: 'invalid_outcome',
        location: { latitude: 40.9903, longitude: 29.027 },
      };
      const res = visitCompletionSchema.safeParse(input);
      expect(res.success).toBe(false);
    });
  });
});
