
import { CardHeader, CardTitle } from "@/components/ui/card";
import { UserSearch } from "./UserSearch";
import { Button } from "@/components/ui/button";
import { UserRoundPlus, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface UsersHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onCreateUser?: () => void;
}

export const UsersHeader = ({ searchTerm, setSearchTerm, onCreateUser }: UsersHeaderProps) => {
  return (
    <CardHeader className="excel-header flex flex-row items-center justify-between py-2">
      <CardTitle className="text-lg">Employees</CardTitle>
      <div className="flex items-center gap-2">
        <UserSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        {onCreateUser && (
          <Button size="sm" className="flex items-center gap-1" onClick={onCreateUser}>
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        )}
        <Link to="/invite-user">
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <UserRoundPlus className="h-4 w-4" />
            Invite User
          </Button>
        </Link>
      </div>
    </CardHeader>
  );
};
