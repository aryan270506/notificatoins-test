import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';

// ─── Mock Notes Data ───────────────────────────────────────────────────────────
const NOTES_DATA = {
  CS201: [
    {
      id: 'n1',
      title: 'Introduction to Arrays & Big-O',
      type: 'Lecture',
      pages: 12,
      date: 'Jan 10, 2025',
      tag: 'Week 1',
      preview:
        'Overview of array data structures, time-space complexity, and the Big-O notation system used throughout the course.',
    },
    {
      id: 'n2',
      title: 'Linked Lists – Singly & Doubly',
      type: 'Lecture',
      pages: 18,
      date: 'Jan 17, 2025',
      tag: 'Week 2',
      preview:
        'Node-based storage, pointer manipulation, insertion/deletion at head, tail and mid-list for both singly and doubly linked variants.',
    },
    {
      id: 'n3',
      title: 'Stacks & Queues',
      type: 'Lecture',
      pages: 10,
      date: 'Jan 24, 2025',
      tag: 'Week 3',
      preview:
        'LIFO and FIFO principles, array vs linked-list implementations, monotonic stack tricks and circular queue optimisation.',
    },
    {
      id: 'n4',
      title: 'Trees: BST, AVL, Red-Black',
      type: 'Lecture',
      pages: 24,
      date: 'Feb 3, 2025',
      tag: 'Week 5',
      preview:
        'Binary Search Trees, self-balancing AVL rotations, Red-Black tree colouring rules and amortised complexity guarantees.',
    },
    {
      id: 'n5',
      title: 'Graph Algorithms – BFS & DFS',
      type: 'Lab Sheet',
      pages: 8,
      date: 'Feb 14, 2025',
      tag: 'Week 6',
      preview:
        'Adjacency list vs matrix representation, breadth-first and depth-first traversal, cycle detection, and topological sort.',
    },
    {
      id: 'n6',
      title: 'Sorting: Merge, Quick & Heap',
      type: 'Lecture',
      pages: 20,
      date: 'Feb 21, 2025',
      tag: 'Week 7',
      preview:
        'Divide-and-conquer approaches, pivot selection strategies, in-place vs out-of-place sorting and comparison-based lower bounds.',
    },
    {
      id: 'n7',
      title: 'Dynamic Programming Basics',
      type: 'Tutorial',
      pages: 14,
      date: 'Mar 3, 2025',
      tag: 'Week 9',
      preview:
        'Memoisation vs tabulation, overlapping subproblems, optimal substructure and classic DP problems: knapsack, LCS, LIS.',
    },
    {
      id: 'n8',
      title: 'Hashing & Hash Tables',
      type: 'Lecture',
      pages: 11,
      date: 'Mar 10, 2025',
      tag: 'Week 10',
      preview:
        'Hash functions, collision handling via chaining and open addressing, load factor, rehashing and amortised O(1) guarantees.',
    },
  ],
  CS202: [
    { id: 'n1', title: 'Process & Thread Concepts', type: 'Lecture', pages: 16, date: 'Jan 12, 2025', tag: 'Week 1', preview: 'Processes vs threads, PCB structure, context switching overhead and multithreading models.' },
    { id: 'n2', title: 'CPU Scheduling Algorithms', type: 'Lecture', pages: 14, date: 'Jan 20, 2025', tag: 'Week 2', preview: 'FCFS, SJF, Round Robin, Priority scheduling — Gantt charts and response/turnaround time calculations.' },
    { id: 'n3', title: 'Deadlocks & Synchronisation', type: 'Lecture', pages: 18, date: 'Jan 28, 2025', tag: 'Week 3', preview: 'Mutex, semaphores, monitors, Banker\'s algorithm, deadlock detection and prevention strategies.' },
    { id: 'n4', title: 'Memory Management & Paging', type: 'Lecture', pages: 22, date: 'Feb 6, 2025', tag: 'Week 5', preview: 'Segmentation, paging, TLBs, page-replacement algorithms: FIFO, LRU, Optimal and Clock.' },
    { id: 'n5', title: 'File System Internals', type: 'Lab Sheet', pages: 9, date: 'Feb 18, 2025', tag: 'Week 7', preview: 'Inodes, FAT, directory structures, file allocation: contiguous, linked, indexed and journaling.' },
    { id: 'n6', title: 'Shell Scripting & System Calls', type: 'Tutorial', pages: 11, date: 'Mar 5, 2025', tag: 'Week 9', preview: 'Bash scripting, fork/exec/wait system calls, pipes, signals and inter-process communication.' },
    { id: 'n7', title: 'Virtual Memory & Demand Paging', type: 'Lecture', pages: 15, date: 'Mar 12, 2025', tag: 'Week 10', preview: 'Working set model, thrashing, demand paging mechanics and performance tuning.' },
    { id: 'n8', title: 'I/O Systems & Device Drivers', type: 'Lecture', pages: 10, date: 'Mar 19, 2025', tag: 'Week 11', preview: 'I/O hardware, polling vs interrupts, DMA, disk scheduling: FCFS, SSTF, SCAN and C-SCAN.' },
  ],
  CS203: [
    { id: 'n1', title: 'Relational Model & ER Diagrams', type: 'Lecture', pages: 20, date: 'Jan 11, 2025', tag: 'Week 1', preview: 'Entity-relationship modelling, crow\'s-foot notation, cardinalities and converting ER to relational schema.' },
    { id: 'n2', title: 'SQL – DDL & DML', type: 'Lecture', pages: 18, date: 'Jan 19, 2025', tag: 'Week 2', preview: 'CREATE, ALTER, DROP, INSERT, UPDATE, DELETE; constraints: PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK.' },
    { id: 'n3', title: 'Advanced SQL Queries', type: 'Lecture', pages: 16, date: 'Jan 26, 2025', tag: 'Week 3', preview: 'Joins (inner, outer, cross), subqueries, CTEs, window functions, GROUP BY and HAVING clauses.' },
    { id: 'n4', title: 'Normalisation: 1NF to BCNF', type: 'Lecture', pages: 24, date: 'Feb 5, 2025', tag: 'Week 5', preview: 'Functional dependencies, closure, canonical cover, decomposition, lossless join and dependency preservation.' },
    { id: 'n5', title: 'Indexing & Query Optimisation', type: 'Lecture', pages: 19, date: 'Feb 17, 2025', tag: 'Week 7', preview: 'B+ trees, hash indexes, query execution plans, cost estimation, join ordering and materialisation.' },
    { id: 'n6', title: 'Transactions & ACID Properties', type: 'Tutorial', pages: 13, date: 'Mar 3, 2025', tag: 'Week 9', preview: 'Atomicity, consistency, isolation, durability; concurrency control: 2PL, timestamp ordering, MVCC.' },
    { id: 'n7', title: 'NoSQL & Document Stores', type: 'Lecture', pages: 15, date: 'Mar 11, 2025', tag: 'Week 10', preview: 'CAP theorem, MongoDB document model, Redis key-value, Cassandra wide-column and graph databases.' },
  ],
  CS205: [
    { id: 'n1', title: 'Finite Automata & Regular Languages', type: 'Lecture', pages: 18, date: 'Jan 13, 2025', tag: 'Week 1', preview: 'DFA, NFA, ε-NFA, subset construction, minimisation and equivalence to regular expressions.' },
    { id: 'n2', title: 'Context-Free Grammars', type: 'Lecture', pages: 20, date: 'Jan 22, 2025', tag: 'Week 3', preview: 'Derivations, parse trees, ambiguity, CNF, CYK parsing and pushdown automata.' },
    { id: 'n3', title: 'Turing Machines', type: 'Lecture', pages: 22, date: 'Feb 4, 2025', tag: 'Week 5', preview: 'Standard TM model, multi-tape TMs, non-determinism, Church-Turing thesis and universal TMs.' },
    { id: 'n4', title: 'Decidability & Reducibility', type: 'Lecture', pages: 17, date: 'Feb 19, 2025', tag: 'Week 7', preview: 'Halting problem, Rice\'s theorem, mapping reductions, Post Correspondence Problem and undecidability proofs.' },
    { id: 'n5', title: 'Complexity Classes P vs NP', type: 'Tutorial', pages: 15, date: 'Mar 7, 2025', tag: 'Week 9', preview: 'Polynomial-time verifiers, NP-completeness, Cook-Levin theorem, SAT, 3-SAT, and approximation algorithms.' },
  ],
  CS301: [
    { id: 'n1', title: 'Introduction to ML & Linear Regression', type: 'Lecture', pages: 22, date: 'Jan 10, 2025', tag: 'Week 1', preview: 'Supervised vs unsupervised, gradient descent, MSE cost function, feature scaling and normal equations.' },
    { id: 'n2', title: 'Logistic Regression & Classification', type: 'Lecture', pages: 18, date: 'Jan 18, 2025', tag: 'Week 2', preview: 'Sigmoid function, binary cross-entropy, decision boundary, multi-class via softmax and one-vs-rest.' },
    { id: 'n3', title: 'Decision Trees & Random Forests', type: 'Lecture', pages: 20, date: 'Jan 27, 2025', tag: 'Week 3', preview: 'Information gain, Gini impurity, pruning, bagging, bootstrap sampling and feature importance.' },
    { id: 'n4', title: 'Neural Networks & Backpropagation', type: 'Lecture', pages: 28, date: 'Feb 7, 2025', tag: 'Week 5', preview: 'MLP architecture, activation functions, forward pass, chain rule backprop, vanishing gradients and Adam optimiser.' },
    { id: 'n5', title: 'CNNs for Image Recognition', type: 'Lab Sheet', pages: 16, date: 'Feb 18, 2025', tag: 'Week 7', preview: 'Convolution, pooling, LeNet, VGG, ResNet skip connections and transfer learning with fine-tuning.' },
    { id: 'n6', title: 'Clustering: K-Means & DBSCAN', type: 'Lecture', pages: 14, date: 'Mar 4, 2025', tag: 'Week 9', preview: 'Lloyd\'s algorithm, elbow method, silhouette score, density-based clustering and noise handling.' },
    { id: 'n7', title: 'Model Evaluation & Cross-Validation', type: 'Tutorial', pages: 12, date: 'Mar 12, 2025', tag: 'Week 10', preview: 'Confusion matrix, ROC-AUC, precision-recall, k-fold CV, bias-variance tradeoff and regularisation.' },
  ],
  CS302: [
    { id: 'n1', title: 'Cloud Fundamentals & IaaS/PaaS/SaaS', type: 'Lecture', pages: 16, date: 'Jan 11, 2025', tag: 'Week 1', preview: 'Cloud service models, deployment types (public, private, hybrid), AWS global infrastructure overview.' },
    { id: 'n2', title: 'AWS Core Services', type: 'Lecture', pages: 20, date: 'Jan 20, 2025', tag: 'Week 2', preview: 'EC2, S3, RDS, IAM, VPC, Route 53, CloudFront and cost optimisation with Reserved vs Spot instances.' },
    { id: 'n3', title: 'Docker & Containerisation', type: 'Lab Sheet', pages: 14, date: 'Feb 3, 2025', tag: 'Week 4', preview: 'Dockerfile authoring, image layers, volumes, networking, Docker Compose multi-service orchestration.' },
    { id: 'n4', title: 'Kubernetes Orchestration', type: 'Lecture', pages: 24, date: 'Feb 17, 2025', tag: 'Week 6', preview: 'Pods, deployments, services, ingress, ConfigMaps, secrets, horizontal pod autoscaler and Helm charts.' },
    { id: 'n5', title: 'Serverless & Lambda', type: 'Tutorial', pages: 11, date: 'Mar 5, 2025', tag: 'Week 9', preview: 'Event-driven architecture, cold starts, API Gateway integration, Step Functions and cost modelling.' },
  ],
  CS303: [
    { id: 'n1', title: 'Cryptography Fundamentals', type: 'Lecture', pages: 22, date: 'Jan 12, 2025', tag: 'Week 1', preview: 'Symmetric & asymmetric encryption, AES, RSA, elliptic curve cryptography, digital signatures and certificates.' },
    { id: 'n2', title: 'Network Security & Firewalls', type: 'Lecture', pages: 18, date: 'Jan 21, 2025', tag: 'Week 2', preview: 'OSI security architecture, packet filtering, stateful inspection, IDS/IPS, DMZ design and VPNs.' },
    { id: 'n3', title: 'Web Application Security (OWASP Top 10)', type: 'Lecture', pages: 20, date: 'Feb 4, 2025', tag: 'Week 4', preview: 'SQL injection, XSS, CSRF, SSRF, insecure deserialization, broken auth and security misconfigurations.' },
    { id: 'n4', title: 'Penetration Testing Methodology', type: 'Lab Sheet', pages: 16, date: 'Feb 19, 2025', tag: 'Week 7', preview: 'Reconnaissance, scanning (Nmap), exploitation (Metasploit), post-exploitation and reporting standards.' },
    { id: 'n5', title: 'Incident Response & Forensics', type: 'Tutorial', pages: 12, date: 'Mar 10, 2025', tag: 'Week 10', preview: 'IR lifecycle, chain of custody, memory/disk forensics, log analysis and SIEM/SOAR platforms.' },
  ],
  CS204: [
    { id: 'n1', title: 'OSI & TCP/IP Models', type: 'Lab Sheet', pages: 14, date: 'Jan 13, 2025', tag: 'Week 1', preview: 'Seven OSI layers vs TCP/IP four-layer model, encapsulation, PDU types and protocol mapping.' },
    { id: 'n2', title: 'IP Addressing & Subnetting', type: 'Lab Sheet', pages: 16, date: 'Jan 22, 2025', tag: 'Week 2', preview: 'IPv4 classes, CIDR notation, subnet mask calculation, VLSM, IPv6 addressing and address translation.' },
    { id: 'n3', title: 'Routing Algorithms: RIP, OSPF, BGP', type: 'Lecture', pages: 20, date: 'Feb 5, 2025', tag: 'Week 4', preview: 'Distance-vector vs link-state routing, Dijkstra SPF, autonomous systems and BGP path attributes.' },
    { id: 'n4', title: 'Transport Layer: TCP vs UDP', type: 'Lab Sheet', pages: 12, date: 'Feb 19, 2025', tag: 'Week 6', preview: 'Three-way handshake, flow control, congestion control (CUBIC), reliability vs low-latency trade-offs.' },
    { id: 'n5', title: 'Network Security Principles', type: 'Lecture', pages: 15, date: 'Mar 6, 2025', tag: 'Week 9', preview: 'TLS/SSL, SSH, IPsec, firewall rules, NAT traversal and zero-trust network architecture.' },
  ],
  MA104: [
    { id: 'n1', title: 'Set Theory & Logic', type: 'Lecture', pages: 16, date: 'Jan 10, 2025', tag: 'Week 1', preview: 'Naive set theory, Venn diagrams, propositional logic, truth tables, equivalences and inference rules.' },
    { id: 'n2', title: 'Proof Techniques', type: 'Lecture', pages: 14, date: 'Jan 19, 2025', tag: 'Week 2', preview: 'Direct proof, proof by contradiction, contrapositive, mathematical induction and strong induction.' },
    { id: 'n3', title: 'Relations & Functions', type: 'Lecture', pages: 18, date: 'Jan 28, 2025', tag: 'Week 3', preview: 'Equivalence relations, partial orders, Hasse diagrams, injections, surjections and bijections.' },
    { id: 'n4', title: 'Graph Theory Fundamentals', type: 'Lab Sheet', pages: 22, date: 'Feb 10, 2025', tag: 'Week 5', preview: 'Graph types, Euler/Hamiltonian paths, planarity, graph colouring, chromatic number and four-colour theorem.' },
    { id: 'n5', title: 'Combinatorics & Counting', type: 'Lecture', pages: 20, date: 'Feb 24, 2025', tag: 'Week 7', preview: 'Permutations, combinations, pigeonhole principle, inclusion-exclusion, generating functions and recurrences.' },
    { id: 'n6', title: 'Number Theory & Cryptography', type: 'Tutorial', pages: 15, date: 'Mar 10, 2025', tag: 'Week 9', preview: 'Modular arithmetic, GCD/Euclidean algorithm, Fermat\'s little theorem, RSA key generation walkthrough.' },
  ],
  CS401: [
    { id: 'n1', title: 'Agile & Scrum Methodology', type: 'Lab Sheet', pages: 14, date: 'Jan 11, 2025', tag: 'Week 1', preview: 'Sprint planning, daily standups, sprint reviews, retrospectives, velocity tracking and product backlog refinement.' },
    { id: 'n2', title: 'Git & Version Control', type: 'Lab Sheet', pages: 12, date: 'Jan 20, 2025', tag: 'Week 2', preview: 'Branching strategies (Gitflow, trunk-based), rebasing, merge conflicts, tagging and GitHub collaboration workflows.' },
    { id: 'n3', title: 'CI/CD Pipelines with GitHub Actions', type: 'Lab Sheet', pages: 16, date: 'Feb 3, 2025', tag: 'Week 4', preview: 'YAML workflow syntax, build/test/deploy stages, secrets management, Docker image publishing and rollback strategies.' },
    { id: 'n4', title: 'Software Testing: Unit & Integration', type: 'Tutorial', pages: 14, date: 'Feb 18, 2025', tag: 'Week 6', preview: 'TDD with Jest/PyTest, mocking, test coverage metrics, integration testing and end-to-end testing with Cypress.' },
    { id: 'n5', title: 'System Design & Architecture', type: 'Lecture', pages: 20, date: 'Mar 5, 2025', tag: 'Week 9', preview: 'Microservices vs monolith, REST API design, load balancing, caching strategies and scalability patterns.' },
    { id: 'n6', title: 'Code Review & Documentation', type: 'Tutorial', pages: 10, date: 'Mar 17, 2025', tag: 'Week 11', preview: 'Effective PR reviews, JSDoc/Sphinx documentation, README standards, API docs with Swagger/OpenAPI.' },
  ],
};

// Type badge colors — kept fixed (they look good on both themes)
const TYPE_COLORS = {
  Lecture:     { bg: '#1E3A5F', text: '#60A5FA', border: '#2563AB' },
  'Lab Sheet': { bg: '#1A3D2E', text: '#34D399', border: '#059669' },
  Tutorial:    { bg: '#3B2A1A', text: '#FB923C', border: '#C2410C' },
};

// ─── NoteCard ─────────────────────────────────────────────────────────────────
const NoteCard = ({ note, accentColor, onPress, C }) => {
  const typeStyle = TYPE_COLORS[note.type] ?? TYPE_COLORS.Lecture;

  return (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top row */}
      <View style={styles.noteTop}>
        <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
          <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>{note.type}</Text>
        </View>
        <Text style={[styles.noteTag, { color: C.textMuted }]}>{note.tag}</Text>
      </View>

      {/* Title */}
      <Text style={[styles.noteTitle, { color: C.textPrimary }]}>{note.title}</Text>

      {/* Preview */}
      <Text style={[styles.notePreview, { color: C.textSub ?? C.textMuted }]} numberOfLines={2}>
        {note.preview}
      </Text>

      {/* Footer */}
      <View style={styles.noteFooter}>
        <Text style={[styles.noteMeta, { color: C.textMuted }]}>📄 {note.pages} pages</Text>
        <Text style={[styles.noteMeta, { color: C.textMuted }]}>{note.date}</Text>
        <TouchableOpacity
          style={[
            styles.downloadBtn,
            { backgroundColor: accentColor + '22', borderColor: accentColor + '66' },
          ]}
          onPress={onPress}
          activeOpacity={0.75}
        >
          <Text style={[styles.downloadBtnText, { color: accentColor }]}>↓ PDF</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main NotesData Screen ────────────────────────────────────────────────────
export default function NotesData({ course, onBack, C, onThemeToggle }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const notes = NOTES_DATA[course.id] ?? [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={C.statusBar ?? 'light-content'}
        backgroundColor={C.bg}
      />

      {/* ── Header ── */}
      <View style={[styles.header, isWide && styles.headerWide, { backgroundColor: C.card }]}>

        {/* Top row: Back + Theme toggle */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Text style={[styles.backArrow, { color: C.textMuted }]}>←</Text>
            <Text style={[styles.backLabel, { color: C.textMuted }]}>Back</Text>
          </TouchableOpacity>

          {/* Theme Toggle */}
          {onThemeToggle && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.iconBtn, { backgroundColor: C.bg, borderColor: C.border }]}
              onPress={onThemeToggle}
            >
              <Text style={styles.iconBtnText}>{C.moonIcon ?? '🌙'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Course info */}
        <View style={styles.headerBody}>
          <View style={[styles.headerIcon, { backgroundColor: course.bg }]}>
            <Text style={[styles.headerIconText, { color: course.color }]}>{course.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseIdLabel, { color: C.textMuted }]}>{course.id}</Text>
            <Text style={[styles.courseTitle, { color: C.textPrimary }]} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum, { color: course.color }]}>{notes.length}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> Topics</Text>
          </View>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum, { color: course.color }]}>
              {notes.reduce((s, n) => s + n.pages, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> Pages</Text>
          </View>
          <View style={[styles.statPill, { borderColor: course.color + '44', backgroundColor: C.bg }]}>
            <Text style={[styles.statNum, { color: course.color }]}>{course.files}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}> PDFs</Text>
          </View>
        </View>
      </View>

      {/* Accent divider */}
      <View style={[styles.accentLine, { backgroundColor: course.color }]} />

      {/* ── Section Header ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>All Notes</Text>
        <Text style={[styles.sectionCount, { color: C.textMuted }]}>{notes.length} topics</Text>
      </View>

      {/* ── Notes List ── */}
      <ScrollView
        contentContainerStyle={[styles.notesList, isWide && styles.notesListWide]}
        showsVerticalScrollIndicator={false}
      >
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: C.textMuted }]}>
              No notes available for this course.
            </Text>
          </View>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              accentColor={course.color}
              onPress={() => console.log('Open note:', note.title)}
              C={C}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 16,
  },
  headerWide: {
    paddingHorizontal: 36,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backArrow: {
    fontSize: 20,
    lineHeight: 22,
  },
  backLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 16,
  },
  headerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 24,
    fontWeight: '700',
  },
  courseIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  accentLine: {
    height: 2,
    opacity: 0.7,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Note Cards ──
  notesList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 4,
  },
  notesListWide: {
    paddingHorizontal: 36,
  },
  noteCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  noteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  noteTag: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  notePreview: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Empty ──
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});