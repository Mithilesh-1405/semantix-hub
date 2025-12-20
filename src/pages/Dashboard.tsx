import { useNavigate } from 'react-router-dom';
import { FileText, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { useBackendHelper } from '@/config/backend_helper';

const features = [
  {
    title: 'Resume Polisher',
    description: 'Upload your resume and get tailored improvements based on job descriptions',
    icon: FileText,
    path: '/dashboard/resume-polisher',
  },
  {
    title: 'PDF Search',
    description: 'Upload PDF documents and search through them with intelligent queries',
    icon: Search,
    path: '/dashboard/pdf-search',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const {getData} = useBackendHelper()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getData();
        console.log(response);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground mb-2">
          Welcome to Semantix
        </h1>
        <p className="text-muted-foreground text-lg">
          Choose a tool to get started
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Card
            key={feature.title}
            onClick={() => navigate(feature.path)}
            className="cursor-pointer group hover:shadow-lg transition-all duration-200 hover:border-primary/50"
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="flex items-center justify-between">
                {feature.title}
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
