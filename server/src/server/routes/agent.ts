import { FastifyInstance } from 'fastify';
import { getAgent, getAgents, createAgent, updateAgent, deleteAgent } from '../../core/agent';
import { authenticate, authorize } from '../../core/auth';
import { CreateAgentInput, UpdateAgentInput } from '../../core/agent/types';
import { Agent } from '../../types';

export default async function agentRoutes(fastify: FastifyInstance) {
  // Get all agents
  fastify.get<{ Reply: Agent[] }>(
    '/agents',
    { preHandler: [authenticate, authorize(['admin'])] },
    async (request, reply) => {
      const agents = await getAgents();
      reply.send(agents);
    }
  );

  // Get agent by ID
  fastify.get<{ Params: { id: string }; Reply: Agent | null }>(
    '/agents/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const agent = await getAgent(request.params.id);
      if (!agent) {
        reply.status(404).send({ message: 'Agent not found' });
      } else {
        reply.send(agent);
      }
    }
  );

  // Get current authenticated agent (me)
  fastify.get<{ Reply: Agent | null }>(
    '/agents/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (!request.agent) {
        reply.status(404).send({ message: 'Agent not found' });
      } else {
        reply.send(request.agent);
      }
    }
  );

  // Create a new agent
  fastify.post<{ Body: CreateAgentInput; Reply: Agent }>(
    '/agents',
    { preHandler: [authenticate, authorize(['admin'])] },
    async (request, reply) => {
      const newAgent = await createAgent(request.body);
      reply.status(201).send(newAgent);
    }
  );

  // Update an agent
  fastify.put<{ Params: { id: string }; Body: UpdateAgentInput; Reply: Agent | null }>(
    '/agents/:id',
    { preHandler: [authenticate, authorize(['admin'])] },
    async (request, reply) => {
      const updatedAgent = await updateAgent(request.params.id, request.body);
      if (!updatedAgent) {
        reply.status(404).send({ message: 'Agent not found' });
      } else {
        reply.send(updatedAgent);
      }
    }
  );

  // Delete an agent
  fastify.delete<{ Params: { id: string } }>(
    '/agents/:id',
    { preHandler: [authenticate, authorize(['admin'])] },
    async (request, reply) => {
      await deleteAgent(request.params.id);
      reply.status(204).send();
    }
  );
}
