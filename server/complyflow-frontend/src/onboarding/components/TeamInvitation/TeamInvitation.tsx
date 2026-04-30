import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Plus, User } from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: string;
}

const TeamInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', email: '', role: 'Administrator' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: `${Date.now()}`, email: '', role: 'Member' }
    ]);
  };

  const removeMember = (id: string) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter(member => member.id !== id));
    }
  };

  const updateMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeamMembers(
      teamMembers.map(member => 
        member.id === id ? { ...member, [field]: value } : member
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log('Team members:', teamMembers);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/onboarding/finalize');
    } catch (error) {
      console.error('Error adding team members:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Invite Your Team</h1>
        <p className="mt-3 text-lg text-gray-600">
          Add team members to get started with compliance management
        </p>
      </div>

      {/* Team Members Form */}
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Invite your teammates to join your ComplyFlow workspace. You can always add more later.
        </p>
        
        <div className="space-y-4">
          {teamMembers.map((member, index) => (
            <div key={member.id} className="flex items-end gap-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex-1">
                <label htmlFor={`email-${member.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {index === 0 ? 'Your Email' : 'Team Member Email *'}
                </label>
                <input
                  type="email"
                  id={`email-${member.id}`}
                  value={member.email}
                  onChange={(e) => updateMember(member.id, 'email', e.target.value)}
                  required={index === 0}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="team@company.com"
                />
              </div>
              
              <div className="w-40">
                <label htmlFor={`role-${member.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id={`role-${member.id}`}
                  value={member.role}
                  onChange={(e) => updateMember(member.id, 'role', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              
              {teamMembers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100"
                >
                  <User className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={addMember}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Another Member
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={teamMembers.some(m => !m.email) || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Continue to Finalize'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TeamInvitation;