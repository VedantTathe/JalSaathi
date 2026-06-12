import React from 'react';
import { useQuery } from 'react-query';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomersManagement = () => {
  const { data, isLoading } = useQuery('admin-customers', () => adminApi.getAllUsers({ role: 'customer', limit: 100 }));
  const customers = data?.data?.users || [];

  if (isLoading) {
    return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900">Customers Management</h2>
        <p className="text-gray-600">View all registered customers and their details</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Address</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {customer.address ? (
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span>{customer.address.street || customer.address.area || 'Address not complete'}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">No address provided</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${customer.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {customer.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersManagement;
