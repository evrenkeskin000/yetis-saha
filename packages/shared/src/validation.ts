import { z } from 'zod';
import { OUTCOMES, ROLES } from './constants';

export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalıdır')
  .refine((val) => /[A-Za-zÀ-ÿ]/.test(val), {
    message: 'Şifre en az bir harf içermelidir',
  })
  .refine((val) => /\d/.test(val), {
    message: 'Şifre en az bir rakam içermelidir',
  });

export const createUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Geçerli bir e-posta adresi girin'),
    full_name: z
      .string()
      .trim()
      .min(2, 'Ad Soyad en az 2 karakter olmalıdır'),
    role: z.enum(ROLES, {
      errorMap: () => ({ message: 'Geçerli bir kullanıcı rolü seçin' }),
    }),
    password: passwordSchema,
    dealership_id: z
      .string()
      .uuid('Geçerli bir bayi seçin')
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'yetis_admin') {
      if (data.dealership_id != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dealership_id'],
          message: 'Yetiş yöneticisi bir bayiye bağlanamaz',
        });
      }
      return;
    }
    if (!data.dealership_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealership_id'],
        message: 'Bayi yöneticisi ve saha temsilcisi için bayi zorunludur',
      });
    }
  });

export const resetPasswordSchema = z.object({
  user_id: z.string().uuid('Geçerli bir kullanıcı kimliği gerekli'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  password: passwordSchema,
});

export const dealershipFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Bayi adı en az 2 karakter olmalıdır'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, {
      message: 'Bayi kodu yalnızca büyük harf, rakam ve tire içerebilir',
    })
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
});

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
export type CreateUserValues = z.infer<typeof createUserSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type DealershipFormValues = z.infer<typeof dealershipFormSchema>;
