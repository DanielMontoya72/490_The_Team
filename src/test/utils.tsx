import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { TextSizeProvider } from '@/components/text-size-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Custom render function that includes providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const testQueryClient = createTestQueryClient();
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter>
          <TextSizeProvider>{children}</TextSizeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
export { screen, waitFor };

// Mock user data for tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

export const mockProfile = {
  id: 'profile-id',
  user_id: 'test-user-id',
  first_name: 'John',
  last_name: 'Doe',
  email: 'test@example.com',
  headline: 'Senior Developer',
  bio: 'Experienced developer',
  phone: '+1234567890',
  location: 'New York, NY',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

export const mockEmployment = {
  id: 'employment-id',
  user_id: 'test-user-id',
  company_name: 'Tech Corp',
  job_title: 'Senior Developer',
  location: 'New York, NY',
  start_date: '2020-01-01',
  end_date: null,
  is_current: true,
  job_description: 'Leading development team',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

export const mockEducation = {
  id: 'education-id',
  user_id: 'test-user-id',
  institution_name: 'University of Test',
  degree_type: 'B.S.',
  field_of_study: 'Computer Science',
  education_level: 'Bachelor',
  graduation_date: '2019-05-15',
  gpa: 3.8,
  show_gpa: true,
  is_current: false,
  achievements: 'Dean\'s List',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

export const mockSkill = {
  id: 'skill-id',
  user_id: 'test-user-id',
  skill_name: 'React',
  category: 'Technical',
  proficiency_level: 'Expert',
  display_order: 0,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

export const mockProject = {
  id: 'project-id',
  user_id: 'test-user-id',
  project_name: 'E-Commerce Platform',
  description: 'Built a scalable e-commerce platform',
  role: 'Lead Developer',
  start_date: '2022-01-01',
  end_date: '2023-01-01',
  status: 'Completed',
  technologies: ['React', 'Node.js', 'PostgreSQL'],
  project_type: 'Web Application',
  team_size: 5,
  outcomes: 'Increased sales by 40%',
  project_url: 'https://example.com',
  repository_link: 'https://github.com/example/repo',
  industry: 'E-commerce',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

export const mockCertification = {
  id: 'cert-id',
  user_id: 'test-user-id',
  certification_name: 'AWS Solutions Architect',
  issuing_organization: 'Amazon Web Services',
  date_earned: '2023-06-01',
  expiration_date: '2026-06-01',
  certification_number: 'AWS-12345',
  category: 'Technical',
  does_not_expire: false,
  verification_status: 'Verified',
  document_url: 'https://verify.aws.com/12345',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};
