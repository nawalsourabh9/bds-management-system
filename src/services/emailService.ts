
import { fastapiService } from './fastapi-service';
import { getOTPEmailTemplate } from './emailTemplates';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface EmailResponse {
  data: {
    id: string;
    from: string;
    to: string[];
    created_at: string;
    [key: string]: any;
  } | null;
  error: Error | null;
}

export const sendEmail = async ({
  to,
  subject,
  body,
  isHtml = false
}: SendEmailParams) => {
  try {
    console.log("Sending email to:", to);
    
    // Add retry logic for network issues
    let retries = 3;
    let success = false;
    let data;
    let error;
    
    while (retries > 0 && !success) {
      try {
        // Send email using FastAPI endpoint with timeout
        const response = await Promise.race([
          fastapiService.sendEmail({
            to,
            subject,
            body,
            isHtml
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Request timeout")), 15000)
          )
        ]) as EmailResponse;
        
        data = response.data;
        error = response.error;
        
        if (!error) {
          success = true;
        }
      } catch (e) {
        console.log(`Email sending attempt failed (${retries} retries left):`, e);
        retries--;
        
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw e;
        }
      }
    }

    if (error) throw error;
    
    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
};

export const sendOTPEmail = async (to: string, otp: string) => {
  try {
    console.log(`Sending OTP email to ${to} with code ${otp}`);
    
    const requestBody = {
      type: 'otp',
      to,
      otp
    };
    
    console.log("Sending with request body:", requestBody);
    
    const response = await Promise.race([
      fastapiService.sendEmail(requestBody),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 20000)
      )
    ]);
    
    if (response.error) {
      console.error("OTP email error response:", response.error);
      throw response.error;
    }
    
    console.log("OTP email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("OTP email service error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    throw error;
  }
};
