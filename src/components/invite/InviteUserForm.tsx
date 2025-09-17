
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fastapiService } from "@/services/fastapi-service";
import { useNavigate } from "react-router-dom";
import { InviteUserFormFields } from "./InviteUserFormFields";

export interface InviteFormData {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  role: string;
  departmentId: string;
  phone?: string;
  supervisorId?: string;
}

export function InviteUserForm() {
  const [formData, setFormData] = useState<InviteFormData>({
    email: "",
    firstName: "",
    lastName: "",
    position: "",
    role: "user",
    departmentId: "",
    phone: "",
    supervisorId: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field: keyof InviteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      console.log("Sending invitation with data:", {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        role: formData.role,
        departmentId: formData.departmentId || null,
        phone: formData.phone || null,
        supervisorId: formData.supervisorId || null
      });
      
      const response = await fastapiService.sendInvitation({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        role: formData.role,
        departmentId: formData.departmentId || null,
        phone: formData.phone || null,
        supervisorId: formData.supervisorId || null
      });

      console.log("Invitation response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation");
      }

      setSuccess(true);
      toast.success(`Invitation sent to ${formData.email}`);
      
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        position: "",
        role: "user",
        departmentId: "",
        phone: "",
        supervisorId: "",
      });
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewInvite = () => {
    setSuccess(false);
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-2xl font-bold">Invite User</CardTitle>
            <CardDescription>
              Send an invitation email to a new user
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      {success ? (
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
            <h3 className="font-medium text-green-800 dark:text-green-300">Invitation Sent!</h3>
            <p className="text-green-700 dark:text-green-400 mt-1">
              An invitation has been sent to {formData.email}.
            </p>
          </div>
          <Button
            className="w-full mt-4"
            onClick={handleNewInvite}
          >
            Send Another Invitation
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <InviteUserFormFields 
              formData={formData}
              onChange={handleChange}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
