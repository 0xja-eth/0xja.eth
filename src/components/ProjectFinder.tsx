'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, ProjectCategory, BlogPost } from '@/data/types';
import {blogCategories, projectCategories} from '@/data/categories';
import { useLanguage } from '@/i18n/context';
import Image from 'next/image';
import { FiFolder, FiTerminal, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';

interface ProjectFinderProps {
  projects: Project[];
  blogs: BlogPost[];
  translations: {
    viewDemo: string;
    viewGithub: string;
    techStack: string;
  };
}

interface Command {
  text: string;
  output: string;
  isError?: boolean;
}

type ViewMode = 'grid' | 'list';
type ContentType = 'Projects' | 'Blogs';

export default function ProjectFinder({ projects, blogs, translations }: ProjectFinderProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'All'>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [contentType, setContentType] = useState<ContentType>('Projects');

  const realView = contentType == "Blogs" ? "list" : view;

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  const filteredProjects = selectedCategory === 'All' 
    ? projects 
    : projects.filter(p => p.category === selectedCategory);

  const filteredBlogs = blogs.filter(blog => 
    selectedCategory === 'All' || blog.category === selectedCategory
  );

  useEffect(() => {
    if (showTerminal) {
      terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
    }
  }, [commands, showTerminal]);

  const handleCommand = (cmd: string) => {
    const commandParts = cmd.trim().split(' ');
    const command = commandParts[0];
    const args = commandParts.slice(1);

    let output = '';
    let isError = false;

    switch (command) {
      case 'ls':
        output = contentType === 'Projects' 
          ? filteredProjects.map(p => `${p.title[language]} (${p.category})`).join('\n')
          : filteredBlogs.map(blog => `${blog.title[language]} (${blog.category})`).join('\n');
        break;
      case 'cd':
        if (args[0] === '..') {
          setSelectedCategory('All');
          output = 'Changed to root directory';
        } else {
          const category = Object.keys(projectCategories).find(
            c => c.toLowerCase() === args[0]?.toLowerCase()
          );
          if (category) {
            setSelectedCategory(category as ProjectCategory);
            output = `Changed to ${category} directory`;
          } else {
            output = 'Directory not found';
            isError = true;
          }
        }
        break;
      case 'cat':
        if (contentType === 'Projects') {
          const project = filteredProjects.find(
            p => p.title[language].toLowerCase().includes(args.join(' ').toLowerCase())
          );
          if (project) {
            setSelectedProject(project);
            output = `
Title: ${project.title[language]}
Category: ${project.category}
Tech Stack: ${project.techStack.join(', ')}
Description: ${project.description[language]}
Period: ${project.startDate} - ${project.endDate}
${project.demoUrl ? `Demo: ${project.demoUrl}` : ''}
${project.githubUrl ? `GitHub: ${project.githubUrl}` : ''}
            `.trim();
          } else {
            output = 'Project not found';
            isError = true;
          }
        } else {
          const blog = filteredBlogs.find(
            blog => blog.title[language].toLowerCase().includes(args.join(' ').toLowerCase())
          );
          if (blog) {
            setSelectedBlog(blog);
            output = `
Title: ${blog.title[language]}
Category: ${blog.category}
Date: ${blog.date}
Description: ${blog.description[language]}
Tags: ${blog.tags.join(', ')}
            `.trim();
          } else {
            output = 'Blog not found';
            isError = true;
          }
        }
        break;
      case 'help':
        output = `
Available commands:
  ls - List all projects in current category
  cd <category> - Change to category directory
  cd .. - Go back to all categories
  cat <project> - Show project details
  clear - Clear terminal
  help - Show this help message
        `.trim();
        break;
      case 'clear':
        setCommands([]);
        return;
      default:
        output = 'Command not found. Type "help" for available commands.';
        isError = true;
    }

    setCommands(prev => [...prev, { text: cmd, output, isError }]);
    setCurrentCommand('');
  };

  return (
    <motion.div
      className={`bg-gray-900/80 backdrop-blur-md rounded-lg overflow-hidden min-h-[600px]
        ${isFullscreen ? 'fixed inset-4 z-50' : 'relative w-full'}`}
      layout
    >
      {/* Finder Header */}
      <div className="bg-gray-800/50 px-4 py-2 flex items-center gap-2 justify-between">
        <div className="flex gap-1.5">
          <button 
            onClick={() => setShowTerminal(false)}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600"
          />
          <button 
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            disabled={contentType == "Blogs"}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600"
          />
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600"
          />
        </div>
        <div className="flex-1 text-center text-sm font-medium">
          {selectedCategory === 'All' 
            ? (language === 'en' ? `All ${contentType}` : '全部项目')
            : (projectCategories[selectedCategory] || blogCategories[selectedCategory]).name[language]
          }
        </div>
        <button
          onClick={() => setShowTerminal(!showTerminal)}
          className="text-gray-400 hover:text-white"
        >
          <FiTerminal />
        </button>
      </div>

      <div className="flex divide-x divide-gray-700/50 h-[calc(100vh-300px)] min-h-[600px]">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 font-sans">
          {/* Root Directory */}
          <button
            onClick={() => {
              setSelectedCategory('All');
              setContentType('Projects');
            }}
            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
              selectedCategory === 'All' && contentType === 'Projects' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/50'
            }`}
          >
            <span className="flex-shrink-0">🛠️</span>
            <span className="truncate">
              {language === 'en' ? 'Projects' : '项目'} ({projects.length})
            </span>
          </button>

          {/* Blog Directory */}
          <button
            onClick={() => {
              setSelectedCategory('All');
              setContentType('Blogs');
            }}
            className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
              selectedCategory === 'All' && contentType === 'Blogs' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/50'
            }`}
          >
            <span className="flex-shrink-0">📝</span>
            <span className="truncate">
              {language === 'en' ? 'Blogs' : '博客'} ({blogs.length})
            </span>
          </button>

          {/* Separator */}
          <div className="border-t border-gray-700/50 my-2"></div>

          {/* Categories */}
          {contentType === 'Projects' ? (
            Object.entries(projectCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as ProjectCategory)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
                  selectedCategory === key ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/50'
                }`}
              >
                <span className="flex-shrink-0">{category.icon}</span>
                <span className="truncate">{category.name[language]} ({projects.filter(p => p.category === key).length})</span>
              </button>
            ))
          ) : (
            Object.entries(blogCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as ProjectCategory)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
                  selectedCategory === key ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/50'
                }`}
              >
                <span className="flex-shrink-0">{category.icon}</span>
                <span className="truncate">{category.name[language]} ({blogs.filter(b => b.category === key).length})</span>
              </button>
            ))
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
          <div className={`grid gap-4 ${
            realView === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            <AnimatePresence mode="popLayout">
              {contentType === 'Projects' ? (
                filteredProjects.map((project) => (
                  <motion.div
                    key={project.title[language]}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setSelectedProject(project)}
                    className={`group cursor-pointer backdrop-blur-sm bg-gray-800/30 rounded-lg overflow-hidden
                      ${view === 'grid' ? 'h-full' : 'flex items-center gap-4'}`}
                  >
                    <div className={`relative ${view === 'grid' ? 'aspect-video' : 'w-64 h-40'}`}>
                      <Image
                        src={project.imageUrl}
                        alt={project.title[language]}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Category Badge */}
                      <div 
                        className="absolute top-2 right-2 z-20 px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1"
                        style={{ backgroundColor: projectCategories[project.category].color + '80' }}
                      >
                        <span>{projectCategories[project.category].icon}</span>
                        {view === 'list' && (
                          <span className="text-xs">{projectCategories[project.category].name[language]}</span>
                        )}
                      </div>

                      {/* Time Period */}
                      <div className="absolute bottom-2 left-2 z-20 bg-black/50 px-2 py-1 rounded font-bold font-sans flex items-center gap-1">
                        <span>{project.startDate}</span>
                      </div>
                    </div>

                    <div className="flex-1 p-4">
                      <h3 className="font-sans font-medium text-lg mb-2 line-clamp-1 font-bold">{project.title[language]}</h3>
                      {view === 'list' && (
                        <p className="font-sans text-sm text-gray-400 line-clamp-2 mb-3">
                          {project.description[language]}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {project.techStack.slice(0, view === 'grid' ? 3 : undefined).map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 bg-gray-700/50 rounded-full text-sm font-sans"
                          >
                            {tech}
                          </span>
                        ))}
                        {view === 'grid' && project.techStack.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-700/50 rounded-full text-sm font-sans">
                            +{project.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                filteredBlogs.map((blog) => (
                  <motion.div
                    key={blog.title[language]}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={
                      // () => setSelectedBlog(blog)
                      () => window.open(blog.blogUrl, '_blank')
                    }
                    className="group cursor-pointer backdrop-blur-sm bg-gray-800/30 rounded-lg overflow-hidden p-4"
                  >
                    {/* Blog Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{blogCategories[blog.category].icon}</span>
                        <h3 className="font-sans font-medium text-lg font-bold">{blog.title[language]}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 font-sans">
                        <span>{blog.date}</span>
                      </div>
                    </div>

                    {/* Blog Content */}
                    <div className="space-y-3">
                      <p className="font-sans text-gray-300 line-clamp-3">
                        {blog.description[language]}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {blog.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-700/50 rounded-full text-sm font-sans"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Blog Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                      <span className="text-sm text-gray-400 font-sans">
                        {blogCategories[blog.category].name[language]}
                      </span>
                      <span className="text-sm text-indigo-400 group-hover:text-indigo-300 font-sans">
                        {language === 'en' ? 'Read More' : '阅读更多'} →
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Terminal */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '33%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="w-1/3 flex-shrink-0 bg-black/50 backdrop-blur-sm overflow-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50"
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto" ref={terminalRef}>
                  {commands.map((cmd, i) => (
                    <div key={i} className="mb-2">
                      <div className="flex items-center gap-2 text-green-400">
                        <span>$</span>
                        <span>{cmd.text}</span>
                      </div>
                      {cmd.output && (
                        <div className={`mt-1 whitespace-pre-wrap ${
                          cmd.isError ? 'text-red-400' : 'text-gray-300'
                        }`}>
                          {cmd.output}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-green-400">
                    <span>$</span>
                    <input
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && currentCommand.trim()) {
                          handleCommand(currentCommand.trim());
                        }
                      }}
                      className="flex-1 bg-transparent outline-none"
                      placeholder="Type 'help' for commands..."
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {portalContainer && selectedProject && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-gray-900/95 backdrop-blur-md rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white"
              >
                <FiX className="w-6 h-6" />
              </button>

              {/* Cover Image */}
              <div className="relative h-[300px]">
                <Image
                  src={selectedProject.imageUrl}
                  alt={selectedProject.title[language]}
                  fill
                  className="object-cover"
                />

                {/* Project Title */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 to-transparent font-sans font-bold">
                  <h2 className="text-3xl mb-2">
                    {selectedProject.title[language]}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>{selectedProject.startDate} - {selectedProject.endDate}</span>
                    <span>•</span>
                    <span>{projectCategories[selectedProject.category].name[language]}</span>
                  </div>
                </div>
              </div>

              {/* Project Content - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-300px)] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                <p className="font-sans text-gray-300 text-lg leading-relaxed whitespace-pre-line">
                  {selectedProject.description[language]}
                </p>

                <div>
                  <h3 className="font-sans font-medium text-lg mb-3">{translations.techStack}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-full text-sm font-sans"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div className="flex gap-4">
                  {selectedProject.githubUrl && (
                    <a
                      href={selectedProject.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-sans"
                    >
                      GitHub
                    </a>
                  )}
                  {selectedProject.demoUrl && (
                    <a
                      href={selectedProject.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-sans"
                    >
                      Demo
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        portalContainer
      )}

      {portalContainer && selectedBlog && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedBlog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-gray-900/95 backdrop-blur-md rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedBlog(null)}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white"
              >
                <FiX className="w-6 h-6" />
              </button>

              {/* Cover Image */}
              {selectedBlog.coverImage && (
                <div className="relative h-[300px]">
                  <Image
                    src={selectedBlog.coverImage}
                    alt={selectedBlog.title[language]}
                    fill
                    className="object-cover"
                  />

                  {/* Blog Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 to-transparent font-sans font-bold">
                    <h2 className="text-3xl mb-2">
                      {selectedBlog.title[language]}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <span>{selectedBlog.date}</span>
                      <span>•</span>
                      <span>{blogCategories[selectedBlog.category].name[language]}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Blog Content - Scrollable */}
              <div className={`p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 ${
                selectedBlog.coverImage ? 'max-h-[calc(90vh-300px)]' : 'max-h-[90vh]'
              }`}>
                {!selectedBlog.coverImage && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{blogCategories[selectedBlog.category].icon}</span>
                      <h2 className="text-3xl font-sans font-bold">
                        {selectedBlog.title[language]}
                      </h2>
                    </div>
                    <div className="text-sm text-gray-400 font-sans">
                      {selectedBlog.date}
                    </div>
                  </div>
                )}

                <div className="font-sans text-gray-300 text-lg leading-relaxed">
                  {selectedBlog.description[language]}
                </div>

                <div>
                  <h3 className="font-sans font-medium text-lg mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBlog.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-full text-sm font-sans"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Read More Link */}
                {selectedBlog.blogUrl && (
                  <div className="flex justify-end">
                    <a
                      href={selectedBlog.blogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-sans"
                    >
                      {language === 'en' ? 'Read More' : '阅读更多'} →
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        portalContainer
      )}
    </motion.div>
  );
}
