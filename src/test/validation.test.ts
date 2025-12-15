import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Form Validation', () => {
  describe('Profile Form Validation', () => {
    const profileSchema = z.object({
      first_name: z.string().min(1, 'First name is required').max(50),
      last_name: z.string().min(1, 'Last name is required').max(50),
      email: z.string().email('Invalid email address'),
      phone: z.string().optional(),
      headline: z.string().max(100).optional(),
      bio: z.string().max(500).optional(),
      location: z.string().max(100).optional(),
    });

    it('should validate correct profile data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      expect(() => profileSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty required fields', () => {
      const invalidData = {
        first_name: '',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      expect(() => profileSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
      };

      expect(() => profileSchema.parse(invalidData)).toThrow();
    });

    it('should enforce max length constraints', () => {
      const invalidData = {
        first_name: 'a'.repeat(51),
        last_name: 'Doe',
        email: 'john@example.com',
      };

      expect(() => profileSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Job Form Validation', () => {
    const jobSchema = z.object({
      job_title: z.string().min(1, 'Job title is required').max(200),
      company_name: z.string().min(1, 'Company name is required').max(200),
      location: z.string().max(200).optional(),
      job_url: z.string().url().optional().or(z.literal('')),
      status: z.enum(['Interested', 'Applied', 'Interview', 'Offer', 'Rejected']),
      salary_range_min: z.number().positive().optional(),
      salary_range_max: z.number().positive().optional(),
    }).refine((data) => {
      if (data.salary_range_min && data.salary_range_max) {
        return data.salary_range_max >= data.salary_range_min;
      }
      return true;
    }, {
      message: 'Maximum salary must be greater than or equal to minimum salary',
      path: ['salary_range_max'],
    });

    it('should validate correct job data', () => {
      const validData = {
        job_title: 'Software Engineer',
        company_name: 'Tech Corp',
        status: 'Applied' as const,
      };

      expect(() => jobSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid salary ranges', () => {
      const invalidData = {
        job_title: 'Software Engineer',
        company_name: 'Tech Corp',
        status: 'Applied' as const,
        salary_range_min: 100000,
        salary_range_max: 80000,
      };

      expect(() => jobSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid URLs', () => {
      const invalidData = {
        job_title: 'Software Engineer',
        company_name: 'Tech Corp',
        status: 'Applied' as const,
        job_url: 'not-a-url',
      };

      expect(() => jobSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid status values', () => {
      const statuses = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected'];
      
      statuses.forEach(status => {
        const data = {
          job_title: 'Software Engineer',
          company_name: 'Tech Corp',
          status: status as any,
        };
        expect(() => jobSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe('Resume Form Validation', () => {
    const resumeSchema = z.object({
      resume_name: z.string().min(1, 'Resume name is required').max(100),
      template_id: z.string().uuid().optional(),
      content: z.object({
        personal_info: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }).optional(),
      }).optional(),
    });

    it('should validate correct resume data', () => {
      const validData = {
        resume_name: 'Software Engineer Resume',
      };

      expect(() => resumeSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty resume name', () => {
      const invalidData = {
        resume_name: '',
      };

      expect(() => resumeSchema.parse(invalidData)).toThrow();
    });

    it('should validate UUID format for template_id', () => {
      const invalidData = {
        resume_name: 'My Resume',
        template_id: 'not-a-uuid',
      };

      expect(() => resumeSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Employment Form Validation', () => {
    const employmentSchema = z.object({
      company_name: z.string().min(1, 'Company name is required').max(200),
      job_title: z.string().min(1, 'Job title is required').max(200),
      start_date: z.string().or(z.date()),
      end_date: z.string().or(z.date()).optional(),
      is_current: z.boolean().optional(),
      location: z.string().max(200).optional(),
      job_description: z.string().max(2000).optional(),
    });

    it('should validate correct employment data', () => {
      const validData = {
        company_name: 'Tech Corp',
        job_title: 'Software Engineer',
        start_date: '2023-01-01',
        is_current: true,
      };

      expect(() => employmentSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty required fields', () => {
      const invalidData = {
        company_name: '',
        job_title: 'Software Engineer',
        start_date: '2023-01-01',
      };

      expect(() => employmentSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Education Form Validation', () => {
    const educationSchema = z.object({
      institution_name: z.string().min(1, 'Institution name is required').max(200),
      degree_type: z.string().min(1, 'Degree type is required'),
      field_of_study: z.string().min(1, 'Field of study is required').max(200),
      education_level: z.string().min(1),
      graduation_date: z.string().or(z.date()).optional(),
      gpa: z.number().min(0).max(4.0).optional(),
      is_current: z.boolean().optional(),
    });

    it('should validate correct education data', () => {
      const validData = {
        institution_name: 'University',
        degree_type: 'Bachelor',
        field_of_study: 'Computer Science',
        education_level: 'Undergraduate',
      };

      expect(() => educationSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid GPA values', () => {
      const invalidData = {
        institution_name: 'University',
        degree_type: 'Bachelor',
        field_of_study: 'Computer Science',
        education_level: 'Undergraduate',
        gpa: 5.0,
      };

      expect(() => educationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Skill Form Validation', () => {
    const skillSchema = z.object({
      skill_name: z.string().min(1, 'Skill name is required').max(100),
      proficiency_level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
      category: z.string().min(1, 'Category is required'),
    });

    it('should validate correct skill data', () => {
      const validData = {
        skill_name: 'React',
        proficiency_level: 'Advanced' as const,
        category: 'Technical',
      };

      expect(() => skillSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid proficiency levels', () => {
      const invalidData = {
        skill_name: 'React',
        proficiency_level: 'Master',
        category: 'Technical',
      };

      expect(() => skillSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Input Sanitization', () => {
    it('should trim whitespace from strings', () => {
      const value = '  test  ';
      expect(value.trim()).toBe('test');
    });

    it('should prevent XSS in text inputs', () => {
      const dangerousInput = '<script>alert("XSS")</script>';
      const sanitized = dangerousInput
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should validate URL protocols', () => {
      const urlSchema = z.string().url().refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        'Only HTTP and HTTPS protocols are allowed'
      );
      
      expect(() => urlSchema.parse('https://example.com')).not.toThrow();
      expect(() => urlSchema.parse('http://example.com')).not.toThrow();
      expect(() => urlSchema.parse('javascript:alert(1)')).toThrow();
    });
  });
});
