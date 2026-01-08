
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { fastapiService } from "@/services/fastapi-service";

const Settings = () => {
  const { user, isAdmin } = useAuth();

  // Company settings state - use static defaults
  const [companySettings, setCompanySettings] = useState({
    display_name: "BDS Manufacturing",
    description: "Electronic Quality Management System",
    industry: "",
    website: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    address_country: "",
    phone: "",
    email: "admin@example.com",
    primary_color: "#FF6B35",
    secondary_color: "#F7931E",
    timezone: "UTC",
    language: "en"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('companySettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setCompanySettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setCompanySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save settings to localStorage
  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem('companySettings', JSON.stringify(companySettings));

      // Simulate API delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to defaults
  const handleCancel = () => {
    setCompanySettings({
      display_name: "Company Setup Required",
      description: "Please configure your company information",
      industry: "",
      website: "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_postal_code: "",
      address_country: "",
      phone: "",
      email: "admin@example.com",
      primary_color: "#FF6B35",
      secondary_color: "#F7931E",
      timezone: "UTC",
      language: "en"
    });
    toast.info('Settings reset to defaults');
  };
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your company settings</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="bg-secondary grid w-full grid-cols-4 p-1 rounded-sm">
          <TabsTrigger value="company" className="rounded-sm data-[state=active]:bg-background">Company</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-sm data-[state=active]:bg-background">Appearance</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-sm data-[state=active]:bg-background">Notifications</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-sm data-[state=active]:bg-background">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card className="border-border">
            <CardHeader className="excel-header">
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your company details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Company Name</Label>
                  <Input
                    id="display_name"
                    value={companySettings.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    className="rounded-sm"
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={companySettings.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="rounded-sm"
                    placeholder="e.g., Manufacturing, Healthcare"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companySettings.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="rounded-sm"
                    placeholder="https://www.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Company Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="rounded-sm"
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companySettings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="rounded-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={companySettings.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                    className="w-full p-2 rounded-sm border border-border bg-background"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address_street">Street Address</Label>
                    <Input
                      id="address_street"
                      value={companySettings.address_street}
                      onChange={(e) => handleInputChange('address_street', e.target.value)}
                      className="rounded-sm"
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_city">City</Label>
                    <Input
                      id="address_city"
                      value={companySettings.address_city}
                      onChange={(e) => handleInputChange('address_city', e.target.value)}
                      className="rounded-sm"
                      placeholder="City Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_state">State/Province</Label>
                    <Input
                      id="address_state"
                      value={companySettings.address_state}
                      onChange={(e) => handleInputChange('address_state', e.target.value)}
                      className="rounded-sm"
                      placeholder="State or Province"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_postal_code">Postal Code</Label>
                    <Input
                      id="address_postal_code"
                      value={companySettings.address_postal_code}
                      onChange={(e) => handleInputChange('address_postal_code', e.target.value)}
                      className="rounded-sm"
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_country">Country</Label>
                    <Input
                      id="address_country"
                      value={companySettings.address_country}
                      onChange={(e) => handleInputChange('address_country', e.target.value)}
                      className="rounded-sm"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <textarea
                  id="description"
                  value={companySettings.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-2 rounded-sm border border-border bg-background min-h-[100px] resize-vertical"
                  placeholder="Brief description of your company..."
                />
              </div>

              {/* Color Theme */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={companySettings.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="w-16 h-10 rounded-sm border border-border p-1"
                      />
                      <Input
                        value={companySettings.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="rounded-sm flex-1"
                        placeholder="#FF6B35"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={companySettings.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="w-16 h-10 rounded-sm border border-border p-1"
                      />
                      <Input
                        value={companySettings.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        className="rounded-sm flex-1"
                        placeholder="#F7931E"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  className="rounded-sm border-border"
                  onClick={handleCancel}
                  disabled={isLoading || !isAdmin}
                >
                  Reset
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 rounded-sm"
                  onClick={handleSaveSettings}
                  disabled={isLoading || !isAdmin}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance">
          <Card className="border-border">
            <CardHeader className="excel-header">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Appearance settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader className="excel-header">
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Notification settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="advanced">
          <Card className="border-border">
            <CardHeader className="excel-header">
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced system settings</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <p className="text-muted-foreground">Advanced settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
