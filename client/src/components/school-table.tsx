import { School } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface SchoolTableProps {
  limit?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
}

export default function SchoolTable({ limit, showViewAll = false, viewAllLink = "/admin/schools" }: SchoolTableProps) {
  const { data: schools, isLoading } = useQuery<{ school: School, studentCount: number }[]>({
    queryKey: ["/api/admin/schools"],
  });

  const displayedSchools = limit && schools ? schools.slice(0, limit) : schools;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!schools || schools.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No schools found</p>
      </div>
    );
  }

  return (
    <div>
      {showViewAll && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Schools</h2>
          <Link href={viewAllLink} className="text-primary hover:text-indigo-700 text-sm font-medium">
            View all
          </Link>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                School Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Students
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedSchools?.map(({ school, studentCount }) => (
              <tr key={school.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{school.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{school.adminName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{studentCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {format(new Date(school.createdAt), 'MMM dd, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-indigo-800 p-0 h-auto">
                    <Eye className="h-4 w-4" />
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
