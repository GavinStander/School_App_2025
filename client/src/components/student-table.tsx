import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Mail, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface StudentTableProps {
  limit?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  schoolId?: number;
  searchQuery?: string;
}

export default function StudentTable({ 
  limit, 
  showViewAll = false, 
  viewAllLink = "/admin/students",
  schoolId,
  searchQuery: externalSearchQuery
}: StudentTableProps) {
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || "");
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  
  // If schoolId is provided, fetch only students from that school
  const queryKey = schoolId 
    ? ["/api/school/students"] 
    : ["/api/admin/students"];
  
  const { data: students, isLoading } = useQuery<any[]>({
    queryKey,
  });

  // Filter students based on search query
  useEffect(() => {
    if (!students) return;
    
    if (!searchQuery) {
      setFilteredStudents(students);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => 
      student.user.username.toLowerCase().includes(query) || 
      student.user.email.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [students, searchQuery]);

  // Update when external search query changes
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const displayedStudents = limit && filteredStudents 
    ? filteredStudents.slice(0, limit) 
    : filteredStudents;

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
      
      {/* Search box */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search students by name or email..."
          className="pl-10 pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {displayedStudents && displayedStudents.length > 0 ? (
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
              {displayedStudents.map((student) => (
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
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {searchQuery ? "No students match your search" : "No students found"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
