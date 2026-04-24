import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
  placeholder?: string;
  className?: string;
}

/**
 * Combobox para o campo de Disciplina.
 * Permite escolher um item da lista OU digitar texto livre.
 * O texto digitado vira o valor mesmo que não exista na lista.
 */
export const DisciplinaCombobox: React.FC<Props> = ({
  value,
  onChange,
  opcoes,
  placeholder = "Ex.: Linguagem",
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [busca, setBusca] = React.useState("");

  const existeNaLista = opcoes.some(
    (o) => o.toLowerCase() === busca.trim().toLowerCase(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            placeholder="Buscar ou digitar disciplina…"
            value={busca}
            onValueChange={setBusca}
          />
          <CommandList>
            {opcoes.length === 0 && !busca.trim() && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Nenhuma disciplina cadastrada. Digite uma livremente.
              </div>
            )}
            <CommandEmpty>
              {busca.trim() ? (
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
                  onClick={() => {
                    onChange(busca.trim());
                    setBusca("");
                    setOpen(false);
                  }}
                >
                  Usar “<span className="font-medium">{busca.trim()}</span>”
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Digite para buscar…
                </span>
              )}
            </CommandEmpty>
            {opcoes.length > 0 && (
              <CommandGroup heading="Disciplinas cadastradas">
                {opcoes.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt);
                      setBusca("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {busca.trim() && !existeNaLista && (
              <CommandGroup heading="Personalizado">
                <CommandItem
                  value={`__novo__${busca}`}
                  onSelect={() => {
                    onChange(busca.trim());
                    setBusca("");
                    setOpen(false);
                  }}
                >
                  <span className="text-sm">
                    Usar “<span className="font-medium">{busca.trim()}</span>”
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
