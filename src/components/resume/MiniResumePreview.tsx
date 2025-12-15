import React from "react";

interface MiniResumePreviewProps {
  name: string;
  type: string; // "chronological" | "functional" | "hybrid" | others
  color: string; // primary color coming from customization settings
}

// Small helper to build inline styles with the accent color
const Accent = ({ color, className }: { color: string; className?: string }) => (
  <div className={className} style={{ backgroundColor: color }} />
);

// Thin line using accent color
const AccentLine = ({ color, className }: { color: string; className?: string }) => (
  <div className={className} style={{ borderColor: color }} />
);

export const MiniResumePreview: React.FC<MiniResumePreviewProps> = ({ name, type, color }) => {
  const lower = name.toLowerCase();
  const isClassic = lower.includes("classic") || lower.includes("clásic");
  const isModern = lower.includes("modern");
  const isProfessional = lower.includes("professional") || lower.includes("profesional");

  // Base container classes + per-variant tweaks
  const containerClass = "h-64 rounded-md overflow-hidden bg-white shadow-sm text-[8px] leading-tight";

  const header = () => {
    if (isClassic) {
      return (
        <div className="text-center pb-2 border-b border-dashed" style={{ borderColor: color }}>
          <div className="font-serif font-bold text-[10px] mb-0.5" style={{ color }}>
            JOHN DOE
          </div>
          <div className="text-gray-600 text-[7px]">Software Engineer • john@email.com • (123) 456-7890</div>
        </div>
      );
    }

    if (isModern) {
      return (
        <div className="pb-2 border-b" style={{ borderColor: color }}>
          <div className="flex items-center justify-between">
            <Accent color={color} className="h-1.5 w-16 rounded" />
            <div className="text-[7px] text-gray-500">portfolio.site</div>
          </div>
          <div className="text-center mt-1">
            <div className="font-sans font-semibold text-[10px]" style={{ color }}>JOHN DOE</div>
          </div>
        </div>
      );
    }

    if (isProfessional) {
      return (
        <div className="pb-2 border-b" style={{ borderColor: color }}>
          <div className="font-sans font-bold tracking-wide text-[9px]" style={{ color }}>JOHN DOE — SOFTWARE ENGINEER</div>
          <div className="text-gray-600 text-[7px]">john@email.com • San Francisco, CA</div>
        </div>
      );
    }

    // Default header
    return (
      <div className="text-center pb-2 border-b" style={{ borderColor: color }}>
        <div className="font-semibold text-[10px]" style={{ color }}>JOHN DOE</div>
        <div className="text-gray-600 text-[7px]">Software Engineer</div>
      </div>
    );
  };

  const sectionTitle = (title: string) => (
    <div className="flex items-center gap-1">
      <Accent color={color} className="h-1.5 w-8 rounded" />
      <div className="font-semibold text-[8px]" style={{ color }}>{title}</div>
    </div>
  );

  const classicChronological = (
    <div className="p-4 space-y-2">
      {header()}
      <div className="space-y-1">
        <div className="font-serif font-semibold text-[8px]" style={{ color }}>EXPERIENCE</div>
        <AccentLine color={color} className="border-b-2" />
        <div className="text-[7px]">
          <div className="flex justify-between"><span className="font-medium">Senior Developer</span><span className="text-gray-500">2020–2024</span></div>
          <div className="text-gray-700">Tech Company Inc.</div>
          <div className="text-gray-600">• Built features • Led team • Improved performance</div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-serif font-semibold text-[8px]" style={{ color }}>EDUCATION</div>
        <AccentLine color={color} className="border-b-2" />
        <div className="text-[7px]">
          <div className="flex justify-between"><span className="font-medium">B.S. Computer Science</span><span className="text-gray-500">2016–2020</span></div>
          <div className="text-gray-700">University Name</div>
        </div>
      </div>
    </div>
  );

  const modernChronological = (
    <div className="p-4 space-y-2">
      {header()}
      <div className="space-y-1">
        {sectionTitle("EXPERIENCE")}
        <div className="text-[7px] space-y-0.5">
          <div className="flex justify-between"><span className="font-medium">Senior Developer</span><span className="text-gray-500">2020–2024</span></div>
          <div className="text-gray-600">Tech Company Inc.</div>
          <div className="text-gray-600">• Led platform migration</div>
        </div>
      </div>
      <div className="space-y-1">
        {sectionTitle("PROJECTS")}
        <div className="text-[7px] text-gray-600">• Analytics Dashboard • Design System</div>
      </div>
    </div>
  );

  const functional = (
    <div className="p-4 space-y-2">
      {header()}
      <div className="space-y-1">
        {sectionTitle("SKILLS")}
        <div className="grid grid-cols-3 gap-2 text-[7px] text-gray-700">
          <div>
            <div className="font-medium">Frontend</div>
            <div className="text-gray-600">React, Tailwind</div>
          </div>
          <div>
            <div className="font-medium">Backend</div>
            <div className="text-gray-600">Node.js, SQL</div>
          </div>
          <div>
            <div className="font-medium">Tools</div>
            <div className="text-gray-600">Git, Figma</div>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {sectionTitle("ACHIEVEMENTS")}
        <div className="text-[7px] text-gray-600">• Increased performance 40% • Led 10+ launches</div>
      </div>
    </div>
  );

  const hybrid = (
    <div className="p-4">
      {header()}
      <div className="flex gap-3 mt-2">
        <div className="w-1/3 pr-2 border-r" style={{ borderColor: color }}>
          <div className="space-y-1">
            {sectionTitle("SKILLS")}
            <div className="text-[7px] text-gray-600">React • Node • Python • SQL</div>
          </div>
          <div className="mt-2 space-y-1">
            {sectionTitle("EDUCATION")}
            <div className="text-[7px] text-gray-700">B.S. CS — University</div>
          </div>
        </div>
        <div className="w-2/3 space-y-2">
          {sectionTitle("EXPERIENCE")}
          <div className="text-[7px]">
            <div className="flex justify-between"><span className="font-medium">Senior Developer</span><span className="text-gray-500">2020–2024</span></div>
            <div className="text-gray-600">Tech Company Inc.</div>
            <div className="text-gray-600">• Led key initiatives</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Choose layout primarily by type, while styling is influenced by name
  let body: React.ReactNode;
  if (type === "functional") body = functional;
  else if (type === "hybrid") body = hybrid;
  else if (isModern) body = modernChronological; // chronological but modern style
  else if (isProfessional) body = classicChronological; // clean classic professional
  else body = classicChronological; // default chronological classic

  return (
    <div className={containerClass}>
      {body}
    </div>
  );
};
