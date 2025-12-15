// Seed data for production - example content for new users

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Manufacturing",
  "Retail & E-commerce",
  "Consulting",
  "Government",
  "Non-profit",
  "Media & Entertainment",
  "Real Estate",
  "Legal",
  "Marketing & Advertising",
  "Hospitality & Tourism",
  "Energy & Utilities",
  "Transportation & Logistics",
  "Telecommunications",
  "Pharmaceuticals",
  "Insurance",
  "Construction"
];

export const JOB_TITLES = [
  // Technology
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "UX Designer",
  "UI Designer",
  "QA Engineer",
  "Machine Learning Engineer",
  "Cloud Architect",
  "Security Engineer",
  // Business
  "Business Analyst",
  "Project Manager",
  "Account Manager",
  "Sales Representative",
  "Marketing Manager",
  "Financial Analyst",
  "HR Manager",
  "Operations Manager",
  "Customer Success Manager",
  "Executive Assistant",
  // Healthcare
  "Registered Nurse",
  "Medical Assistant",
  "Healthcare Administrator",
  "Pharmacist",
  "Physical Therapist",
  // Other
  "Consultant",
  "Teacher",
  "Research Scientist",
  "Content Writer",
  "Graphic Designer"
];

export const SKILLS_TAXONOMY = {
  technical: [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP",
    "React", "Angular", "Vue.js", "Node.js", "Express.js", "Django", "Flask", "Spring Boot",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform",
    "Git", "CI/CD", "Jenkins", "GitHub Actions",
    "REST APIs", "GraphQL", "Microservices",
    "Machine Learning", "TensorFlow", "PyTorch", "Data Analysis", "Pandas", "NumPy",
    "HTML", "CSS", "Tailwind CSS", "SASS", "Bootstrap",
    "Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator",
    "Agile", "Scrum", "Jira", "Confluence"
  ],
  soft: [
    "Communication", "Leadership", "Problem Solving", "Critical Thinking",
    "Teamwork", "Collaboration", "Time Management", "Organization",
    "Adaptability", "Flexibility", "Creativity", "Innovation",
    "Attention to Detail", "Decision Making", "Conflict Resolution",
    "Presentation Skills", "Public Speaking", "Written Communication",
    "Emotional Intelligence", "Empathy", "Active Listening",
    "Negotiation", "Persuasion", "Networking",
    "Project Management", "Strategic Planning", "Analytical Thinking"
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "AWS Certified Developer",
    "Google Cloud Professional",
    "Microsoft Azure Administrator",
    "Certified Kubernetes Administrator (CKA)",
    "PMP (Project Management Professional)",
    "Scrum Master Certification (CSM)",
    "CompTIA Security+",
    "CISSP",
    "CPA (Certified Public Accountant)",
    "PHR/SPHR (HR Certification)",
    "Six Sigma Green Belt",
    "Six Sigma Black Belt",
    "Salesforce Administrator",
    "HubSpot Certification"
  ]
};

export const SAMPLE_JOB_POSTINGS = [
  {
    title: "Senior Software Engineer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    type: "Full-time",
    salary_min: 150000,
    salary_max: 200000,
    description: "We're looking for a Senior Software Engineer to join our platform team. You'll be working on building scalable systems that serve millions of users.",
    requirements: [
      "5+ years of software development experience",
      "Strong proficiency in Python or Java",
      "Experience with distributed systems",
      "Excellent problem-solving skills"
    ],
    industry: "Technology"
  },
  {
    title: "Product Manager",
    company: "Innovation Labs",
    location: "New York, NY",
    type: "Full-time",
    salary_min: 120000,
    salary_max: 160000,
    description: "Lead product strategy and roadmap for our flagship SaaS product. Work closely with engineering, design, and marketing teams.",
    requirements: [
      "3+ years of product management experience",
      "Strong analytical skills",
      "Excellent communication abilities",
      "Experience with agile methodologies"
    ],
    industry: "Technology"
  },
  {
    title: "Data Analyst",
    company: "FinanceFirst",
    location: "Chicago, IL",
    type: "Full-time",
    salary_min: 80000,
    salary_max: 110000,
    description: "Analyze financial data to provide insights for business decisions. Create dashboards and reports for stakeholders.",
    requirements: [
      "2+ years of data analysis experience",
      "Proficiency in SQL and Excel",
      "Experience with visualization tools (Tableau, Power BI)",
      "Strong attention to detail"
    ],
    industry: "Finance & Banking"
  },
  {
    title: "Marketing Manager",
    company: "GrowthCo",
    location: "Remote",
    type: "Full-time",
    salary_min: 90000,
    salary_max: 130000,
    description: "Lead our digital marketing initiatives including SEO, content marketing, and paid advertising campaigns.",
    requirements: [
      "4+ years of marketing experience",
      "Experience with marketing automation tools",
      "Strong analytical and creative skills",
      "Proven track record of campaign success"
    ],
    industry: "Marketing & Advertising"
  },
  {
    title: "UX Designer",
    company: "DesignStudio",
    location: "Austin, TX",
    type: "Full-time",
    salary_min: 95000,
    salary_max: 140000,
    description: "Create intuitive and beautiful user experiences for our web and mobile applications.",
    requirements: [
      "3+ years of UX design experience",
      "Proficiency in Figma or Sketch",
      "Strong portfolio demonstrating design process",
      "Experience with user research"
    ],
    industry: "Technology"
  }
];

export const INTERVIEW_QUESTIONS_BANK = {
  behavioral: [
    {
      question: "Tell me about a time when you had to deal with a difficult coworker.",
      category: "Conflict Resolution",
      tips: "Use the STAR method. Focus on the resolution and what you learned."
    },
    {
      question: "Describe a situation where you had to meet a tight deadline.",
      category: "Time Management",
      tips: "Highlight your prioritization skills and how you handled pressure."
    },
    {
      question: "Give an example of a goal you reached and how you achieved it.",
      category: "Achievement",
      tips: "Be specific about the goal, your actions, and measurable results."
    },
    {
      question: "Tell me about a time you failed. How did you handle it?",
      category: "Learning from Failure",
      tips: "Show self-awareness and focus on what you learned."
    },
    {
      question: "Describe a time when you had to lead a team.",
      category: "Leadership",
      tips: "Discuss your leadership style and the outcomes achieved."
    },
    {
      question: "Tell me about a time you had to adapt to a significant change.",
      category: "Adaptability",
      tips: "Show flexibility and positive attitude toward change."
    },
    {
      question: "Give an example of how you've handled a disagreement with your manager.",
      category: "Communication",
      tips: "Focus on professional resolution and maintaining respect."
    },
    {
      question: "Describe a project you're most proud of.",
      category: "Achievement",
      tips: "Choose something relevant to the role and quantify impact."
    }
  ],
  technical: [
    {
      question: "Explain how you would design a URL shortening service.",
      category: "System Design",
      tips: "Consider scalability, data storage, and unique ID generation."
    },
    {
      question: "What is the difference between SQL and NoSQL databases?",
      category: "Databases",
      tips: "Discuss use cases, scalability, and data structure differences."
    },
    {
      question: "How would you optimize a slow database query?",
      category: "Performance",
      tips: "Mention indexing, query analysis, and caching strategies."
    },
    {
      question: "Explain RESTful API design principles.",
      category: "API Design",
      tips: "Cover HTTP methods, status codes, and resource naming."
    },
    {
      question: "What is the difference between authentication and authorization?",
      category: "Security",
      tips: "Provide clear definitions and examples of each."
    },
    {
      question: "How do you ensure code quality in your projects?",
      category: "Best Practices",
      tips: "Discuss testing, code reviews, and documentation."
    }
  ],
  situational: [
    {
      question: "How would you handle a project with unclear requirements?",
      category: "Problem Solving",
      tips: "Show initiative in seeking clarification and managing ambiguity."
    },
    {
      question: "What would you do if you disagreed with a team decision?",
      category: "Teamwork",
      tips: "Balance expressing your view with supporting team consensus."
    },
    {
      question: "How would you prioritize multiple urgent tasks?",
      category: "Prioritization",
      tips: "Discuss your framework for assessing urgency and importance."
    },
    {
      question: "What would you do if you noticed a colleague struggling?",
      category: "Collaboration",
      tips: "Show empathy and willingness to help while respecting boundaries."
    }
  ],
  common: [
    {
      question: "Why do you want to work here?",
      category: "Motivation",
      tips: "Research the company and connect their mission to your goals."
    },
    {
      question: "What are your greatest strengths?",
      category: "Self-Assessment",
      tips: "Choose strengths relevant to the role with examples."
    },
    {
      question: "What are your weaknesses?",
      category: "Self-Assessment",
      tips: "Be honest and show how you're working to improve."
    },
    {
      question: "Where do you see yourself in 5 years?",
      category: "Career Goals",
      tips: "Show ambition while aligning with realistic growth at the company."
    },
    {
      question: "Why are you leaving your current job?",
      category: "Motivation",
      tips: "Stay positive and focus on growth opportunities."
    },
    {
      question: "What salary are you expecting?",
      category: "Compensation",
      tips: "Research market rates and provide a range based on your research."
    }
  ]
};

export const RESUME_TEMPLATES = [
  {
    name: "Professional Classic",
    description: "Traditional format ideal for corporate roles",
    sections: ["Summary", "Experience", "Education", "Skills"],
    style: "classic"
  },
  {
    name: "Modern Minimal",
    description: "Clean, contemporary design for tech roles",
    sections: ["Summary", "Skills", "Experience", "Projects", "Education"],
    style: "modern"
  },
  {
    name: "Creative Portfolio",
    description: "Visual layout for design and creative positions",
    sections: ["About Me", "Portfolio", "Experience", "Skills", "Education"],
    style: "creative"
  },
  {
    name: "Entry Level",
    description: "Perfect for recent graduates and career changers",
    sections: ["Objective", "Education", "Projects", "Skills", "Activities"],
    style: "entry"
  }
];

export const COVER_LETTER_TEMPLATES = [
  {
    name: "Standard Professional",
    description: "Traditional format suitable for most industries",
    tone: "formal",
    structure: ["Opening Hook", "Why This Company", "Key Qualifications", "Call to Action"]
  },
  {
    name: "Enthusiastic Startup",
    description: "Energetic tone for startup and tech companies",
    tone: "enthusiastic",
    structure: ["Attention Grabber", "Passion for Mission", "Relevant Experience", "Eager Closing"]
  },
  {
    name: "Career Changer",
    description: "Highlights transferable skills for industry transitions",
    tone: "confident",
    structure: ["Career Journey", "Transferable Skills", "Fresh Perspective", "Commitment"]
  },
  {
    name: "Referral Based",
    description: "Leverages networking connections",
    tone: "warm",
    structure: ["Referral Mention", "Mutual Connection", "Qualifications", "Follow-up Request"]
  }
];

export const FAQ_CONTENT = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create my first job application?",
        a: "Navigate to the Jobs page and click 'Add Job'. Fill in the company name, job title, and other details. You can also paste a job posting URL to auto-fill information."
      },
      {
        q: "How do I upload my resume?",
        a: "Go to the Resumes page and click 'Upload Resume'. You can upload PDF or Word documents. The system will parse your resume and extract key information."
      },
      {
        q: "Can I track applications from multiple job boards?",
        a: "Yes! Use the Platform Tracking feature to import and consolidate applications from LinkedIn, Indeed, Glassdoor, and other platforms."
      }
    ]
  },
  {
    category: "Features",
    questions: [
      {
        q: "What is the Interview Response Library?",
        a: "It's a personal database of your best interview answers. You can store, categorize, and practice responses to common interview questions."
      },
      {
        q: "How does the AI cover letter generator work?",
        a: "Our AI analyzes your resume and the job description to create personalized cover letters. You can customize the tone, length, and focus areas."
      },
      {
        q: "Can I share my profile with mentors or advisors?",
        a: "Yes! Use the Mentors or External Advisors features to invite people who can view your progress and provide guidance."
      }
    ]
  },
  {
    category: "Account & Privacy",
    questions: [
      {
        q: "Is my data secure?",
        a: "Absolutely. We use industry-standard encryption and security practices. Your data is never shared without your explicit consent."
      },
      {
        q: "Can I export my data?",
        a: "Yes, you can export your job applications, resumes, and other data from the Settings page."
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings > Account and click 'Delete Account'. This will permanently remove all your data."
      }
    ]
  }
];

export const GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: "Complete Your Profile",
    description: "Add your work experience, education, and skills to help AI generate better recommendations.",
    action: "Go to Profile",
    path: "/profile-enhanced"
  },
  {
    step: 2,
    title: "Upload Your Resume",
    description: "Upload your current resume to use as a foundation for tailored applications.",
    action: "Upload Resume",
    path: "/resumes"
  },
  {
    step: 3,
    title: "Add Your First Job",
    description: "Start tracking a job you're interested in. Add details about the position and company.",
    action: "Add Job",
    path: "/jobs"
  },
  {
    step: 4,
    title: "Set Career Goals",
    description: "Define your short-term and long-term career objectives to stay focused.",
    action: "Set Goals",
    path: "/career-goals"
  },
  {
    step: 5,
    title: "Explore Interview Prep",
    description: "Practice with mock interviews and build your response library.",
    action: "Start Practicing",
    path: "/mock-interview"
  }
];
