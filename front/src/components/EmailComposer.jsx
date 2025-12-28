import React, { useState, useEffect, useRef } from 'react';
import { X, Send, FileText, Sparkles, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Image as ImageIcon, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $getRoot, $getSelection, $createParagraphNode, $createTextNode, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';

// Configuration de l'éditeur Lexical
const editorConfig = {
  namespace: 'EmailComposer',
  theme: {
    text: {
      bold: 'editor-text-bold',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
    },
    paragraph: 'editor-paragraph',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3',
    },
    list: {
      ul: 'editor-list-ul',
      ol: 'editor-list-ol',
      listitem: 'editor-listitem',
    },
    link: 'editor-link',
  },
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode],
  onError: (error) => {
    console.error(error);
  },
};

// Toolbar Component
function ToolbarPlugin({ onEmojiClick }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Fermer l'emoji picker si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertLink = () => {
    const url = prompt('Entrez l\'URL:');
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  const insertImage = () => {
    const url = prompt('Entrez l\'URL de l\'image:');
    if (url) {
      editor.update(() => {
        const selection = $getSelection();
        if (selection) {
          const imgHtml = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />`;
          const parser = new DOMParser();
          const dom = parser.parseFromString(imgHtml, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          selection.insertNodes(nodes);
        }
      });
    }
  };

  const handleEmojiSelect = (emojiObject) => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection) {
        selection.insertText(emojiObject.emoji);
      }
    });
    setShowEmojiPicker(false);
  };

  return (
    <div className="lexical-toolbar">
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        className={isBold ? 'is-active' : ''}
        title="Gras"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        className={isItalic ? 'is-active' : ''}
        title="Italique"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        className={isUnderline ? 'is-active' : ''}
        title="Souligné"
      >
        <Underline size={16} />
      </button>
      <div className="toolbar-separator"></div>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND)}
        title="Liste à puces"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND)}
        title="Liste numérotée"
      >
        <ListOrdered size={16} />
      </button>
      <div className="toolbar-separator"></div>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        title="Aligner à gauche"
      >
        <AlignLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        title="Centrer"
      >
        <AlignCenter size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        title="Aligner à droite"
      >
        <AlignRight size={16} />
      </button>
      <div className="toolbar-separator"></div>
      <button
        type="button"
        onClick={insertLink}
        title="Insérer un lien"
      >
        <LinkIcon size={16} />
      </button>
      <button
        type="button"
        onClick={insertImage}
        title="Insérer une image"
      >
        <ImageIcon size={16} />
      </button>
      <div className="toolbar-separator"></div>
      <div style={{ position: 'relative' }} ref={emojiPickerRef}>
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Insérer un emoji"
          className={showEmojiPicker ? 'is-active' : ''}
        >
          <Smile size={16} />
        </button>
        {showEmojiPicker && (
          <div style={{ position: 'absolute', top: '40px', left: '0', zIndex: 1000 }}>
            <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" />
          </div>
        )}
      </div>
    </div>
  );
}

// Plugin pour initialiser le contenu de l'éditeur avec du HTML ou du texte
function InitialContentPlugin({ initialContent }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialContent) return;

    // Délai pour s'assurer que l'éditeur est prêt
    const timer = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        // Convertir le HTML en texte si nécessaire
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialContent, 'text/html');

        try {
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        } catch (error) {
          console.error('Erreur parsing HTML:', error);
          // Fallback: traiter comme du texte brut
          const paragraphs = initialContent.split('\n').filter(line => line.trim());
          paragraphs.forEach(text => {
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(text));
            root.append(paragraph);
          });
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [editor, initialContent]);

  return null;
}

const EmailComposer = ({
  isOpen,
  onClose,
  contact,
  API_BASE,
  AuthService,
  onEmailSent
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    recipient_name: '',
    subject: '',
    body: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const [templateContent, setTemplateContent] = useState(''); // Contenu initial du template (ne change qu'à la sélection)

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      if (contact) {
        setEmailData(prev => ({
          ...prev,
          recipient_email: contact.email || '',
          recipient_name: contact.name || ''
        }));
      }
    }
  }, [isOpen, contact]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/email-templates`, { headers });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);

    let subject = template.subject;
    let body = template.body;

    const replacements = {
      '{{contact_name}}': contact?.name || '[Nom]',
      '{{company_name}}': 'Votre Entreprise',
      '{{sender_name}}': AuthService.getUser()?.email?.split('@')[0] || 'Votre nom',
      '{{quote_number}}': 'DEVIS-001',
      '{{subject}}': '[Sujet]',
      '{{news_content}}': '[Contenu]'
    };

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setEmailData(prev => ({
      ...prev,
      subject,
      body
    }));

    // Définir le contenu du template pour l'initialisation de l'éditeur
    setTemplateContent(body);

    // Force re-render of editor with new content
    setEditorKey(prev => prev + 1);
  };

  const handleEditorChange = (editorState, editor) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      setEmailData(prev => ({ ...prev, body: htmlString }));
    });
  };

  const handleSend = async () => {
    if (!emailData.recipient_email || !emailData.subject || !emailData.body) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const payload = {
        contact_id: contact?.id || null,
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        subject: emailData.subject,
        body: emailData.body,
        template_id: selectedTemplate?.id || null
      };

      const response = await fetch(`${API_BASE}/emails`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Email envoyé avec succès !');
        if (onEmailSent) onEmailSent();
        handleClose();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error}`);
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Vérifier s'il y a du contenu non sauvegardé
    const hasUnsavedContent = emailData.subject.trim() || emailData.body.trim();

    if (hasUnsavedContent) {
      const confirmClose = window.confirm(
        'Vous avez du contenu non enregistré. Êtes-vous sûr de vouloir fermer sans envoyer ?'
      );
      if (!confirmClose) {
        return; // Ne pas fermer
      }
    }

    // Réinitialiser et fermer
    setEmailData({
      recipient_email: '',
      recipient_name: '',
      subject: '',
      body: ''
    });
    setSelectedTemplate(null);
    setTemplateContent('');
    setEditorKey(prev => prev + 1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="email-composer-overlay" onClick={handleClose}>
      <div className="email-composer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="email-composer-header">
          <div>
            <h2 className="email-composer-title">
              <Send size={20} />
              Envoyer un email
            </h2>
            {contact && (
              <p className="email-composer-subtitle">
                À : {contact.name} ({contact.email})
              </p>
            )}
          </div>
          <button onClick={handleClose} className="email-composer-close">
            <X size={20} />
          </button>
        </div>

        <div className="email-composer-body">
          {/* Templates selector */}
          <div className="email-form-group">
            <label className="email-form-label">
              <FileText size={16} />
              Utiliser un template (optionnel)
            </label>
            <select
              className="email-form-select"
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const templateId = parseInt(e.target.value);
                const template = templates.find(t => t.id === templateId);
                if (template) handleTemplateSelect(template);
              }}
              disabled={loadingTemplates}
            >
              <option value="">-- Aucun template --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="email-template-badge">
                <Sparkles size={14} />
                Template : {selectedTemplate.name}
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="email-form-group">
            <label className="email-form-label">Email destinataire *</label>
            <input
              type="email"
              className="email-form-input"
              value={emailData.recipient_email}
              onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
              placeholder="contact@example.com"
              required
            />
          </div>

          {/* Recipient name */}
          <div className="email-form-group">
            <label className="email-form-label">Nom destinataire</label>
            <input
              type="text"
              className="email-form-input"
              value={emailData.recipient_name}
              onChange={(e) => setEmailData({ ...emailData, recipient_name: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>

          {/* Subject */}
          <div className="email-form-group">
            <label className="email-form-label">Objet *</label>
            <input
              type="text"
              className="email-form-input"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              placeholder="Objet de votre email"
              required
            />
          </div>

          {/* Body - Lexical Editor */}
          <div className="email-form-group">
            <label className="email-form-label">Message *</label>
            <div className="lexical-editor-wrapper">
              <LexicalComposer key={editorKey} initialConfig={editorConfig}>
                <ToolbarPlugin />
                <div className="lexical-editor-container">
                  <RichTextPlugin
                    contentEditable={<ContentEditable className="lexical-content-editable" />}
                    placeholder={<div className="lexical-placeholder">Rédigez votre message...</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <OnChangePlugin onChange={handleEditorChange} />
                  <InitialContentPlugin initialContent={templateContent} />
                  <HistoryPlugin />
                  <ListPlugin />
                  <LinkPlugin />
                </div>
              </LexicalComposer>
            </div>
          </div>

          {/* Variables helper */}
          {selectedTemplate && selectedTemplate.variables?.length > 0 && (
            <div className="email-variables-helper">
              <p className="email-variables-title">Variables disponibles :</p>
              <div className="email-variables-list">
                {selectedTemplate.variables.map(variable => (
                  <span key={variable} className="email-variable-tag">
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="email-composer-footer">
          <button
            onClick={handleClose}
            className="email-btn-secondary"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            className="email-btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>Envoi en cours...</>
            ) : (
              <>
                <Send size={16} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
