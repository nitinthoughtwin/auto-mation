import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function DataDeletionStatusPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-white">Data Deletion Request</CardTitle>
          <CardDescription className="text-gray-400">
            Your data deletion request has been processed
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-gray-300">
          <p className="mb-4">
            All your personal data associated with this application has been scheduled for deletion.
          </p>
          <p className="text-sm text-gray-500">
            This process may take up to 30 days to complete. If you have any questions, 
            please contact our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
