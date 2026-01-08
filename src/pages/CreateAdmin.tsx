
import { useState, useEffect } from "react";
import { fastapiService } from "@/services/fastapi-service";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CreateAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const navigate = useNavigate();

  const createAdminUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await fastapiService.createAdmin();
      
      if (error) throw error;
      
      setResult({
        success: true,
        message: 'Super Admin user created successfully!'
      });
    } catch (error) {
      console.error('Error creating admin:', error);
      setResult({
        success: false,
        message: `Failed to create admin: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    createAdminUser();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Admin User</CardTitle>
          <CardDescription>
            Setting up a Super Admin account with the provided credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-center text-muted-foreground">
                Creating Super Admin account...
              </p>
            </div>
          ) : result ? (
            <div className="flex flex-col items-center justify-center py-6">
              {result.success ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <p className="mt-4 text-center">
                {result.message}
              </p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
            disabled={loading}
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateAdmin;
