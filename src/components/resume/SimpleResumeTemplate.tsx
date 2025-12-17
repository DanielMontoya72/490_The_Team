import React from 'react';

interface SimpleResumeTemplateProps {
  data: any;
  primaryColor?: string;
  templateStyle?: string;
}

export const SimpleResumeTemplate: React.FC<SimpleResumeTemplateProps> = ({ data, primaryColor = '#222', templateStyle = 'classic' }) => {
  // Template-specific styles
  const isModern = templateStyle === 'modern';
  const isCreative = templateStyle === 'creative';
  const isEntry = templateStyle === 'entry';

  const headerAlign = isModern ? 'left' : isCreative ? 'center' : 'center';
  const fontFamily = isCreative ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif';
  const fontSize = isEntry ? '13px' : '13.5px';
  
  // A4 size: 210mm x 297mm at 96dpi = 794px x 1123px
  return (
    <div
      style={{
        fontFamily,
        color: '#222',
        background: '#fff',
        width: '794px', // A4 width at 96dpi
        margin: 0,
        padding: isModern ? '48px 56px' : '40px 48px',
        fontSize,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: headerAlign, marginBottom: isModern ? 16 : 8 }}>
        <h1 style={{ fontSize: isModern ? 36 : isCreative ? 34 : 32, fontWeight: isModern ? 800 : 700, margin: 0, color: isModern ? primaryColor : '#222' }}>
          {data.personalInfo.name}
        </h1>
        {data.personalInfo.headline && (
          <div style={{ fontWeight: 600, fontSize: isModern ? 16 : 18, margin: '4px 0 0 0', color: isModern ? '#555' : '#222' }}>
            {data.personalInfo.headline}
          </div>
        )}
      </div>
      {/* Contact Row */}
      <div style={{
        display: 'flex',
        justifyContent: headerAlign === 'left' ? 'flex-start' : 'center',
        alignItems: 'center',
        gap: 18,
        fontSize: 13,
        marginBottom: isModern ? 24 : 18,
        flexWrap: 'wrap',
        borderBottom: isModern ? `1px solid ${primaryColor}` : 'none',
        paddingBottom: isModern ? 8 : 0,
      }}>
        {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
        {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
        {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
        {data.personalInfo.linkedin && <span>{data.personalInfo.linkedin}</span>}
      </div>
      {/* Section: Objective */}
      {data.summary && (
        <>
          <SectionTitle color={primaryColor} style={templateStyle}>OBJECTIVE</SectionTitle>
          <div style={{ marginBottom: 12, lineHeight: isEntry ? 1.4 : 1.5 }}>{data.summary}</div>
        </>
      )}
      {/* Section: Skills */}
      {data.skills && data.skills.length > 0 && (
        <>
          <SectionTitle color={primaryColor} style={templateStyle}>TECHNICAL SKILLS</SectionTitle>
          {isCreative ? (
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.skills.map((skill: string, i: number) => (
                <span key={i} style={{ padding: '4px 12px', border: `1px solid ${primaryColor}`, borderRadius: 4, fontSize: 12 }}>
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <ul style={{ marginBottom: 12, marginTop: 0, paddingLeft: 18 }}>
              {data.skills.map((skill: string, i: number) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {/* Section: Experience */}
      {data.experience && data.experience.length > 0 && (
        <>
          <SectionTitle color={primaryColor} style={templateStyle}>PROFESSIONAL EXPERIENCE</SectionTitle>
          {data.experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginBottom: isEntry ? 8 : 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{exp.jobTitle}{exp.company ? `, ${exp.company}` : ''}</span>
                <span style={{ fontStyle: isCreative ? 'italic' : 'normal' }}>{exp.dates}</span>
              </div>
              {exp.location && <div style={{ fontSize: 13, color: '#444' }}>{exp.location}</div>}
              {exp.description && <div style={{ fontSize: 13, lineHeight: 1.4 }}>{exp.description}</div>}
            </div>
          ))}
        </>
      )}
      {/* Section: Education */}
      {data.education && data.education.length > 0 && (
        <>
          <SectionTitle color={primaryColor} style={templateStyle}>EDUCATION</SectionTitle>
          {data.education.map((edu: any, i: number) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{edu.degree}{edu.institution ? `, ${edu.institution}` : ''}</span>
                <span>{edu.year}</span>
              </div>
              {edu.location && <div style={{ fontSize: 13, color: '#444' }}>{edu.location}</div>}
              {edu.gpa && <div style={{ fontSize: 13 }}>GPA: {edu.gpa}</div>}
            </div>
          ))}
        </>
      )}
      {/* Section: Additional */}
      {data.additional && (
        <>
          <SectionTitle color={primaryColor} style={templateStyle}>ADDITIONAL INFORMATION</SectionTitle>
          <div>{data.additional}</div>
        </>
      )}
    </div>
  );
};

const SectionTitle: React.FC<{ color: string; children: React.ReactNode; style: string }> = ({ color, children, style }) => {
  const isModern = style === 'modern';
  const isCreative = style === 'creative';
  const isEntry = style === 'entry';

  return (
    <div style={{
      fontWeight: 700,
      fontSize: isModern ? 14 : isCreative ? 16 : 15,
      letterSpacing: isModern ? 2 : isCreative ? 0.5 : 1,
      margin: isEntry ? '14px 0 4px 0' : '18px 0 4px 0',
      color,
      borderBottom: isCreative ? 'none' : `2px solid ${color}`,
      borderLeft: isCreative ? `4px solid ${color}` : 'none',
      paddingBottom: isCreative ? 0 : 2,
      paddingLeft: isCreative ? 8 : 0,
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  );
};

export default SimpleResumeTemplate;
