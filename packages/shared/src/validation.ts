import { z } from 'zod';
import { OUTCOMES } from './constants';

export const trPhoneRegex = /^(?:\+90|0)?5\d{9}$/;

export const trPhoneSchema = z
  .string()
  .trim()
  .refine((val) => val === '' || trPhoneRegex.test(val), {
    message: 'Geçerli bir cep telefonu girin (05XXXXXXXXX)',
  });

export const geoPointSchema = z.object({
  latitude: z
    .number({ invalid_type_error: 'Enlem sayısal olmalıdır' })
    .min(-90, 'Enlem -90 ile 90 arasında olmalıdır')
    .max(90, 'Enlem -90 ile 90 arasında olmalıdır'),
  longitude: z
    .number({ invalid_type_error: 'Boylam sayısal olmalıdır' })
    .min(-180, 'Boylam -180 ile 180 arasında olmalıdır')
    .max(180, 'Boylam -180 ile 180 arasında olmalıdır'),
}).refine(
  (point) =>
    point.latitude >= 35.5 &&
    point.latitude <= 42.5 &&
    point.longitude >= 25.5 &&
    point.longitude <= 45.0,
  {
    message: 'Konum Türkiye sınırları içerisinde olmalıdır',
  }
);

export const customerFormSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, 'İşletme adı en az 2 karakter olmalıdır'),
  owner_name: z.string().trim().optional().or(z.literal('')),
  phone: trPhoneSchema.optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  category_id: z.string().uuid('Geçerli bir kategori seçin'),
  location: geoPointSchema,
  geofence_radius_m: z
    .number()
    .min(25, 'Geofence yarıçapı en az 25m olmalıdır')
    .max(1000, 'Geofence yarıçapı en fazla 1000m olmalıdır')
    .default(100),
  notes: z
    .string()
    .trim()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .or(z.literal('')),
});

export const checkInSchema = z.object({
  customer_id: z.string().uuid('Geçerli bir müşteri seçin'),
  location: geoPointSchema,
  is_mock_location: z.boolean().default(false),
  notes: z
    .string()
    .trim()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .or(z.literal('')),
});

export const visitCompletionSchema = z.object({
  visit_id: z.string().uuid('Geçerli bir ziyaret seçin'),
  outcome: z.enum(OUTCOMES, {
    errorMap: () => ({ message: 'Geçerli bir ziyaret sonucu seçin' }),
  }),
  location: geoPointSchema,
  notes: z
    .string()
    .trim()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .or(z.literal('')),
  is_mock_location: z.boolean().default(false),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
export type CheckInFormValues = z.infer<typeof checkInSchema>;
export type VisitCompletionFormValues = z.infer<typeof visitCompletionSchema>;
