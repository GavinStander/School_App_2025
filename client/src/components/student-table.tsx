import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface StudentTableProps {
  limit?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  schoolId?: number;
}

export default function StudentTable({ 
  limit, 
  showViewAll = false, 
  viewAllLink = "/admin/students",
  schoolId
}: StudentTableProps) {
  // If schoolId is provided, fetch only students from that school
  const queryKey = schoolId 
    ? ["/api/school/students"] 
    : ["/api/admin/students"];
  
  const { data: students, isLoading } = useQuery<any[]>({
    queryKey,
  });

  const displayedStudents = limit && students ? students.slice(0, limit) : students;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No students found</p>
      </div>
    );
  }

  return (
    <div>
      {showViewAll && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Latest Students</h2>
          <a href={viewAllLink} className="text-primary hover:text-indigo-700 text-sm font-medium">
            View all
          </a>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              {!schoolId && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedStudents?.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200 text-gray-500">
                        {student.user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{student.user.email}</div>
                </td>
                {!schoolId && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.school?.name}</div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {format(new Date(student.createdAt), 'MMM dd, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-2">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-indigo-800 p-0 h-auto">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 p-0 h-auto">
                    <Mail className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
