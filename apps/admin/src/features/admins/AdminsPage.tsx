import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldPlus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LoadingState } from '../../components/LoadingState';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../auth/AuthContext';
import { ADMIN_API, apiRequest, unwrapList } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Admin } from '../../types/domain';

const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(10), role: z.enum(['STAFF', 'SUPERADMIN']) });
type Values = z.infer<typeof schema>;

export function AdminsPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['admins'], queryFn: async () => unwrapList<Admin>(await apiRequest(ADMIN_API.admins), ['admins']), enabled: admin?.role === 'SUPERADMIN' });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: 'STAFF' } });
  const mutation = useMutation({ mutationFn: (values: Values) => apiRequest(ADMIN_API.admins, { method: 'POST', body: values }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admins'] }); reset(); setOpen(false); } });
  if (admin?.role !== 'SUPERADMIN') return <EmptyState icon={UsersRound} title="Superadmin access required" description="Only a superadmin can create or review administrative accounts." />;
  if (query.isLoading) return <LoadingState label="Loading administrators" />;
  const admins = query.data ?? [];
  return <div><PageHeader eyebrow="Identity management" title="Admin accounts" description="Create controlled staff identities without exposing public signup." actions={<Button onClick={() => setOpen(true)}><ShieldPlus size={17} /> Create admin</Button>} /><section className="panel">{admins.length ? <div className="table-wrap"><table><thead><tr><th>Administrator</th><th>Role</th><th>Created</th></tr></thead><tbody>{admins.map((item) => <tr key={item.id}><td><div className="stacked-cell"><strong>{item.name ?? 'Administrator'}</strong><span>{item.email}</span></div></td><td><Badge tone={item.role === 'SUPERADMIN' ? 'purple' : 'neutral'}>{item.role}</Badge></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={UsersRound} title="No additional admins" description="Create a staff account for another trusted operator." actionLabel="Create admin" onAction={() => setOpen(true)} />}</section><Modal isOpen={open} onClose={() => setOpen(false)} title="Create admin account" description="There is no public admin registration route." size="sm"><form className="form-stack" onSubmit={handleSubmit((values) => mutation.mutate(values))}><label className="field"><span>Name</span><input {...register('name')} />{errors.name ? <small>{errors.name.message}</small> : null}</label><label className="field"><span>Email</span><input type="email" {...register('email')} />{errors.email ? <small>{errors.email.message}</small> : null}</label><label className="field"><span>Temporary password</span><input type="password" {...register('password')} />{errors.password ? <small>{errors.password.message}</small> : null}</label><label className="field"><span>Role</span><select {...register('role')}><option value="STAFF">Staff</option><option value="SUPERADMIN">Superadmin</option></select></label>{mutation.error ? <div className="form-alert">{mutation.error.message}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" isLoading={mutation.isPending}>Create account</Button></div></form></Modal></div>;
}
