import { requireAdmin } from "../_lib/require-admin";
import { db } from "@/lib/db";
import { toggleCharacterStatus, toggleThemeStatus } from "../_actions/moderation";

export default async function AdminCatalogPage() {
  await requireAdmin();

  // Load characters and themes
  const characters = await db.character.findMany({
    orderBy: { id: "asc" },
  });
  const themes = await db.theme.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Themes catalog */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-press-start text-[#E8A33D]">Themes Catalog</h1>
          <p className="text-xs text-[#F2E9D8]/60 font-mono">Aktifkan atau nonaktifkan tema papan permainan ular tangga</p>
        </div>

        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg overflow-hidden shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#4B4A57]/30 bg-[#1B1A1F]/50 text-xs font-mono text-[#F2E9D8]/50">
                <th className="p-4">Theme Name</th>
                <th className="p-4">Description</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme: any) => (
                <tr key={theme.id} className="border-b border-[#4B4A57]/10 text-sm font-mono">
                  <td className="p-4 font-bold text-[#F2E9D8]">{theme.name}</td>
                  <td className="p-4 text-xs text-[#F2E9D8]/70 max-w-xs">{theme.description}</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      theme.isEnabled ? "bg-[#5FA35A]/20 text-[#5FA35A]" : "bg-[#C24A4A]/20 text-[#C24A4A]"
                    }`}>
                      {theme.isEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await toggleThemeStatus(theme.id, !theme.isEnabled);
                      }}
                    >
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded font-press-start cursor-pointer border-b-2 border-black ${
                          theme.isEnabled ? "bg-[#C24A4A] text-white" : "bg-[#5FA35A] text-white"
                        }`}
                      >
                        {theme.isEnabled ? "DISABLE" : "ENABLE"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Characters catalog */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-press-start text-[#5FA35A]">Characters Roster</h1>
          <p className="text-xs text-[#F2E9D8]/60 font-mono">Aktifkan atau nonaktifkan hero dalam roster pemilihan karakter</p>
        </div>

        <div className="bg-[#232129] border border-[#4B4A57]/30 rounded-lg overflow-hidden shadow-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#4B4A57]/30 bg-[#1B1A1F]/50 text-xs font-mono text-[#F2E9D8]/50">
                <th className="p-4">Character</th>
                <th className="p-4">Role</th>
                <th className="p-4">Ability</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((char: any) => (
                <tr key={char.id} className="border-b border-[#4B4A57]/10 text-sm font-mono">
                  <td className="p-4 font-bold text-[#F2E9D8]">{char.name}</td>
                  <td className="p-4 text-xs text-[#F2E9D8]/70">{char.role}</td>
                  <td className="p-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-[#E8A33D]">{char.abilityName}</span>
                      <span className="text-[#F2E9D8]/60 max-w-xs">{char.abilityDesc}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      char.isEnabled ? "bg-[#5FA35A]/20 text-[#5FA35A]" : "bg-[#C24A4A]/20 text-[#C24A4A]"
                    }`}>
                      {char.isEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await toggleCharacterStatus(char.id, !char.isEnabled);
                      }}
                    >
                      <button
                        type="submit"
                        className={`text-xs px-3 py-1.5 rounded font-press-start cursor-pointer border-b-2 border-black ${
                          char.isEnabled ? "bg-[#C24A4A] text-white" : "bg-[#5FA35A] text-white"
                        }`}
                      >
                        {char.isEnabled ? "DISABLE" : "ENABLE"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
