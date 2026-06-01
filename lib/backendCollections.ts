// Mock database with 50 pre-loaded topics/collections
export const BACKEND_COLLECTIONS = [
  // Knowledge Base Categories
  { id: 1, name: 'Machine Learning Basics', category: 'AI/ML', description: 'Fundamentals of ML algorithms' },
  { id: 2, name: 'Deep Learning', category: 'AI/ML', description: 'Neural networks and deep learning' },
  { id: 3, name: 'Natural Language Processing', category: 'AI/ML', description: 'NLP techniques and models' },
  { id: 4, name: 'Computer Vision', category: 'AI/ML', description: 'Image processing and CV algorithms' },
  { id: 5, name: 'Data Science Fundamentals', category: 'Data', description: 'Data analysis and statistics' },
  { id: 6, name: 'Big Data Processing', category: 'Data', description: 'Hadoop, Spark, and distributed systems' },
  { id: 7, name: 'Database Design', category: 'Databases', description: 'SQL and NoSQL databases' },
  { id: 8, name: 'Cloud Computing', category: 'Cloud', description: 'AWS, GCP, Azure cloud platforms' },
  { id: 9, name: 'DevOps & CI/CD', category: 'DevOps', description: 'Continuous integration and deployment' },
  { id: 10, name: 'Kubernetes Orchestration', category: 'DevOps', description: 'Container orchestration' },
  { id: 11, name: 'Web Development Basics', category: 'Web Dev', description: 'HTML, CSS, JavaScript fundamentals' },
  { id: 12, name: 'React Framework', category: 'Web Dev', description: 'React.js and component architecture' },
  { id: 13, name: 'Node.js Backend', category: 'Web Dev', description: 'Server-side JavaScript development' },
  { id: 14, name: 'REST APIs', category: 'Web Dev', description: 'RESTful API design and development' },
  { id: 15, name: 'GraphQL', category: 'Web Dev', description: 'GraphQL query language and APIs' },
  { id: 16, name: 'Mobile Development', category: 'Mobile', description: 'iOS, Android development' },
  { id: 17, name: 'Cybersecurity Basics', category: 'Security', description: 'Network security fundamentals' },
  { id: 18, name: 'Encryption & Cryptography', category: 'Security', description: 'Cryptographic algorithms' },
  { id: 19, name: 'System Design', category: 'Architecture', description: 'Large-scale system design' },
  { id: 20, name: 'Microservices Architecture', category: 'Architecture', description: 'Building microservices' },
  { id: 21, name: 'Software Testing', category: 'QA', description: 'Unit testing and test automation' },
  { id: 22, name: 'Git & Version Control', category: 'Tools', description: 'Git workflows and best practices' },
  { id: 23, name: 'Docker Containers', category: 'DevOps', description: 'Docker containerization' },
  { id: 24, name: 'Java Programming', category: 'Languages', description: 'Java fundamentals and OOP' },
  { id: 25, name: 'Python Programming', category: 'Languages', description: 'Python basics and advanced topics' },
  { id: 26, name: 'C++ Programming', category: 'Languages', description: 'C++ and systems programming' },
  { id: 27, name: 'Go Language', category: 'Languages', description: 'Go for concurrent programming' },
  { id: 28, name: 'Rust Programming', category: 'Languages', description: 'Rust systems programming' },
  { id: 29, name: 'Agile Methodology', category: 'Project Management', description: 'Agile and Scrum practices' },
  { id: 30, name: 'Product Management', category: 'Project Management', description: 'Product strategy and planning' },
  { id: 31, name: 'Business Analytics', category: 'Analytics', description: 'Data analytics for business' },
  { id: 32, name: 'Blockchain Technology', category: 'Crypto', description: 'Blockchain and smart contracts' },
  { id: 33, name: 'Internet of Things', category: 'IoT', description: 'IoT devices and applications' },
  { id: 34, name: 'Artificial Intelligence Ethics', category: 'AI/ML', description: 'AI ethics and responsible AI' },
  { id: 35, name: 'Reinforcement Learning', category: 'AI/ML', description: 'RL algorithms and applications' },
  { id: 36, name: 'Time Series Analysis', category: 'Data', description: 'Time series forecasting' },
  { id: 37, name: 'Data Visualization', category: 'Data', description: 'Charts, dashboards, and visualization' },
  { id: 38, name: 'Linux System Administration', category: 'Infrastructure', description: 'Linux servers and systems' },
  { id: 39, name: 'Network Administration', category: 'Infrastructure', description: 'Network protocols and management' },
  { id: 40, name: 'Performance Optimization', category: 'Engineering', description: 'Code and system optimization' },
  { id: 41, name: 'API Security', category: 'Security', description: 'Securing REST and GraphQL APIs' },
  { id: 42, name: 'OAuth & Authentication', category: 'Security', description: 'Authentication and authorization' },
  { id: 43, name: 'Machine Learning Operations', category: 'AI/ML', description: 'MLOps and model deployment' },
  { id: 44, name: 'Computer Networks', category: 'Networking', description: 'Network fundamentals' },
  { id: 45, name: 'Operating Systems', category: 'Systems', description: 'OS concepts and internals' },
  { id: 46, name: 'Databases Query Optimization', category: 'Databases', description: 'Query performance tuning' },
  { id: 47, name: 'Message Queues', category: 'Architecture', description: 'RabbitMQ, Kafka, and messaging' },
  { id: 48, name: 'Caching Strategies', category: 'Performance', description: 'Redis and caching techniques' },
  { id: 49, name: 'Technical Writing', category: 'Documentation', description: 'Documentation and technical writing' },
  { id: 50, name: 'Open Source Contribution', category: 'Community', description: 'Contributing to open source' },
];

// Mock sample data for each collection
export const COLLECTION_DATA: Record<number, string[]> = {};

// Initialize collection data for all 50 collections
BACKEND_COLLECTIONS.forEach((collection) => {
  COLLECTION_DATA[collection.id] = [
    `${collection.name} is an important topic in ${collection.category}`,
    collection.description,
    `Key concepts in ${collection.name} include foundational principles and best practices`,
    `Learning ${collection.name} will help you understand modern ${collection.category} practices`,
  ];
});
