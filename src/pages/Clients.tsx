import { useState } from 'react';
import { Plus, Building2, MoreHorizontal, Users, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string | null;
};

const roleLabel: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  member: 'Membro',
  operador: 'Operador',
  visualizador: 'Visualizador',
};

export default function Clients() {
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('operador');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', profile?.workspace_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, created_at')
        .eq('workspace_id', profile!.workspace_id);
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    enabled: !!profile?.workspace_id,
    staleTime: 30_000,
    retry: 1,
  });

  const columns = [
    {
      key: 'full_name',
      header: 'Membro',
      render: (item: Member) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {(item.full_name || item.email || 'U').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-foreground">{item.full_name || '—'}</div>
            <div className="text-xs text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Função',
      render: (item: Member) => (
        <Badge variant="outline" className="border-border text-muted-foreground text-xs capitalize">
          {roleLabel[item.role ?? ''] ?? item.role ?? 'Membro'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <Badge className="text-xs bg-success/15 text-success border-success/30">Ativo</Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Desde',
      render: (item: Member) => (
        <span className="text-muted-foreground text-sm">
          {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: () => (
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Membros</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros do seu workspace</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium">
              <Plus className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Convidar Membro</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Convide um colaborador para este workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-mail</Label>
                <Input
                  id="email"
                  placeholder="colega@empresa.com"
                  className="bg-secondary border-border"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Função</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">
                Cancelar
              </Button>
              <Button className="btn-premium" onClick={() => setIsDialogOpen(false)}>
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
                <p className="text-3xl font-bold font-display text-foreground">{members.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Membros Ativos</p>
                <p className="text-3xl font-bold font-display text-success">{members.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 border border-dashed border-border rounded-xl">
          <Users className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Nenhum membro encontrado</p>
          <Button className="btn-premium" size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Convidar Membro
          </Button>
        </div>
      ) : (
        <DataTable columns={columns} data={members} keyField="id" />
      )}
    </div>
  );
}
