import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Users, Mail, Phone, MapPin, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const CustomersManagement = () => {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);

  const { data, isLoading } = useQuery('admin-customers', () => adminApi.getAllUsers({ role: 'customer', limit: 100 }));
  const customers = data?.data?.users || [];

  const deleteMutation = useMutation(
    (userId) => adminApi.deleteUser(userId),
    {
      onSuccess: () => {
        toast.success('Customer deleted successfully');
        queryClient.invalidateQueries('admin-customers');
        setDeletingId(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
        setDeletingId(null);
      }
    }
  );

  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setDeletingId(userId);
      deleteMutation.mutate(userId);
    }
  };

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
                <th className="p-4 font-semibold text-right">Actions</th>
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
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(customer._id)}
                      disabled={deletingId === customer._id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Customer"
                    >
                      {deletingId === customer._id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
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
